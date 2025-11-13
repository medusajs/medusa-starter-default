import type { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { MedusaError, Modules } from '@medusajs/framework/utils'
import { parse } from 'csv-parse/sync'
import { importCache, cleanupCache } from './import-cache'

/**
 * POST /vendor/products/import
 * 
 * Step 1: Parse CSV and return preview (does NOT create products yet)
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    // Get authenticated seller
    const sellerId = req.auth_context?.actor_id
    
    if (!sellerId) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        'Seller authentication required'
      )
    }

    // Get file from request
    const file = (req as any).file || (req as any).files?.[0]
    
    if (!file) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'No file uploaded'
      )
    }

    // Read CSV content
    let csvContent: string
    if (file.buffer) {
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

    console.log(`📦 Seller ${sellerId} previewing import...`)

    // Parse CSV
    const rows = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      cast: false,
    })

    console.log(`📦 Parsed ${rows.length} rows...`)

    // Check which SKUs already exist
    const inventoryService = req.scope.resolve(Modules.INVENTORY)
    const allSkus = rows.map((r: any) => r['SKU']).filter(Boolean)
    const existingSkuSet = new Set<string>()
    
    try {
      const existingItems = await inventoryService.listInventoryItems({
        sku: allSkus
      })
      existingItems.forEach((item: any) => {
        if (item.sku) existingSkuSet.add(item.sku)
      })
      console.log(`📦 Found ${existingSkuSet.size} existing SKUs`)
    } catch (error) {
      console.warn('Could not check existing SKUs:', error.message)
    }

    // Validate and count products (don't create yet)
    let toCreate = 0
    let toUpdate = 0
    const skipped: any[] = []
    const errors: any[] = []

    for (let i = 0; i < rows.length; i++) {
      try {
        const row: any = rows[i]
        const rowNum = i + 2

        // Extract core fields
        const title = row['Title'] || row['Item Name']
        const sku = row['SKU']

        // Validate required fields
        if (!title || !sku) {
          skipped.push({
            row: rowNum,
            reason: 'Missing title or SKU',
            sku: sku || 'N/A',
            title: title || 'N/A'
          })
          continue
        }

        // Check if SKU already exists
        if (existingSkuSet.has(sku)) {
          toUpdate++
        } else {
          toCreate++
        }
      } catch (error: any) {
        const row: any = rows[i]
        errors.push({
          row: i + 2,
          sku: row['SKU'] || 'N/A',
          title: row['Title'] || row['Item Name'] || 'N/A',
          error: error.message
        })
      }
    }

    // Generate transaction ID and cache the data
    const transactionId = `import_${sellerId}_${Date.now()}`
    importCache.set(transactionId, {
      rows,
      sellerId,
      timestamp: Date.now()
    })

    // Clean up old cache entries
    cleanupCache()

    console.log(`📊 Preview Summary:`)
    console.log(`   Total: ${rows.length}`)
    console.log(`   To Create: ${toCreate}`)
    console.log(`   To Update: ${toUpdate}`)
    console.log(`   Skipped: ${skipped.length}`)
    console.log(`   Errors: ${errors.length}`)

    // Return preview (not created yet!)
    res.status(200).json({
      transaction_id: transactionId,
      summary: {
        total: rows.length,
        toCreate,
        toUpdate,
        skipped: skipped.length,
        errors: errors.length,
      },
      message: toUpdate > 0 
        ? `Found ${toUpdate} existing product(s) that will be skipped. ${toCreate} new product(s) will be created.`
        : 'Ready to import. Please confirm.',
      skipped: skipped.slice(0, 10),
      errorDetails: errors.slice(0, 10)
    })

  } catch (error: any) {
    console.error('❌ Preview failed:', error)
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to preview import'
    })
  }
}


