import type { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { MedusaError } from '@medusajs/framework/utils'
import { parse } from 'csv-parse/sync'
import { createProductsWorkflow } from '@medusajs/medusa/core-flows'

/**
 * POST /admin/products/import
 * 
 * Import products from CSV (supports your warehouse inventory format)
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const file = (req as any).file || (req as any).files?.[0] || (req.body as any)?.file
    
    if (!file) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'No file uploaded'
      )
    }

    // Read CSV content
    let csvContent: string
    if (typeof file === 'string') {
      csvContent = file
    } else if (file.buffer) {
      csvContent = file.buffer.toString('utf-8')
    } else if (file.path) {
      const fs = require('fs')
      csvContent = fs.readFileSync(file.path, 'utf-8')
    } else {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Invalid file format'
      )
    }

    // Parse CSV
    const rows = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    })

    if (rows.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'CSV file is empty'
      )
    }

    console.log(`📊 Processing ${rows.length} products...`)

    // Process import
    return await processProductImport(req, res, rows)
  } catch (error: any) {
    console.error('❌ Import error:', error)
    res.status(400).json({
      error: error.message || 'Failed to process import'
    })
  }
}

/**
 * Process product import from CSV
 */
async function processProductImport(
  req: MedusaRequest,
  res: MedusaResponse,
  rows: any[]
) {
  const created: any[] = []
  const skipped: any[] = []
  const errors: any[] = []

  for (let i = 0; i < rows.length; i++) {
    try {
      const row: any = rows[i]
      const rowNum = i + 2

      // Extract and convert fields
      const title = row['Title'] || row['Item Name']
      const sku = row['SKU']
      const status = row['Status']?.toLowerCase() === 'active' ? 'published' : 'draft'
      const description = row['Product Description'] || ''
      const priceString = row['Your Price GBP (Sell on Amazon, UK)'] || '0'
      const quantity = parseInt(row['Quantity (UK)'] || '0')

      if (!title || !sku) {
        skipped.push({
          row: rowNum,
          reason: 'Missing title or SKU',
          sku: sku || 'N/A',
          title: title || 'N/A'
        })
        continue
      }

      // Convert price
      const price = parseFloat(priceString.replace(/[£$€,]/g, '').trim()) || 0

      // Convert weight to grams
      const weightStr = row['Item Weight'] || '0'
      const weightUnit = row['Item Weight Unit'] || 'g'
      let weight = parseFloat(weightStr) || 0
      if (weightUnit?.toLowerCase() === 'kg') weight *= 1000
      if (weightUnit?.toLowerCase() === 'lb') weight *= 453.592

      // Store ALL columns as metadata
      const metadata: Record<string, any> = {}
      for (const [key, value] of Object.entries(row)) {
        if (value !== undefined && value !== '' && value !== null) {
          const metadataKey = key.toLowerCase().replace(/[^a-z0-9]+/g, '_')
          metadata[metadataKey] = value
        }
      }

      metadata.import_source = 'warehouse_csv'
      metadata.import_date = new Date().toISOString()

      // Create product
      const { result } = await createProductsWorkflow(req.scope).run({
        input: {
          products: [{
            title,
            subtitle: row['Bullet Point'] || '',
            description,
            status,
            is_giftcard: false,
            discountable: true,
            handle: `${sku.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
            weight,
            metadata,
            variants: [{
              title: row['Size'] || row['Colour'] || 'Default',
              sku,
              manage_inventory: true,
              allow_backorder: false,
              prices: [{
                amount: Math.round(price * 100),
                currency_code: 'gbp'
              }],
              options: row['Size'] ? { Size: row['Size'] } : 
                       row['Colour'] ? { Color: row['Colour'] } : undefined,
              metadata: { ...metadata, variant_sku: sku, quantity }
            }],
            images: row['Main Image URL'] ? [{
              url: row['Main Image URL']
            }] : undefined
          }]
        }
      })

      created.push({
        row: rowNum,
        sku,
        title,
        product_id: result[0]?.id
      })

      console.log(`✅ Row ${rowNum}: Created "${title}" (${sku})`)

    } catch (error: any) {
      console.error(`❌ Row ${i + 2} error:`, error.message)
      errors.push({
        row: i + 2,
        sku: rows[i]['SKU'] || 'N/A',
        title: rows[i]['Title'] || rows[i]['Item Name'] || 'N/A',
        error: error.message
      })
    }
  }

  const total = rows.length
  const successRate = total > 0 ? ((created.length / total) * 100).toFixed(1) : '0'

  console.log(`\n📊 Import Summary:`)
  console.log(`   Total: ${total}`)
  console.log(`   Created: ${created.length}`)
  console.log(`   Skipped: ${skipped.length}`)
  console.log(`   Errors: ${errors.length}`)
  console.log(`   Success Rate: ${successRate}%\n`)

  res.status(200).json({
    success: true,
    message: `Import completed: ${created.length}/${total} products created`,
    summary: {
      total,
      created: created.length,
      skipped: skipped.length,
      errors: errors.length,
      successRate: `${successRate}%`,
      toCreate: created.length,  // For compatibility with Medusa format
      toUpdate: 0
    },
    transaction_id: `warehouse_${Date.now()}`,  // Return transaction_id for UI compatibility
    created: created.slice(0, 10),
    skipped: skipped.slice(0, 10),
    errorDetails: errors.slice(0, 10)
  })
}

