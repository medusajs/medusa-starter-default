import type { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { MedusaError, Modules, ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { createProductsWorkflow, createInventoryLevelsWorkflow } from '@medusajs/medusa/core-flows'
import { SELLER_MODULE } from '@mercurjs/b2c-core/modules/seller'
import { importCache, importStatusCache } from '../../import-cache'

/**
 * POST /vendor/products/import/:id/confirm
 * 
 * Step 2: Actually create the products from cached CSV data
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const { id: transactionId } = req.params
    const sellerId = req.auth_context?.actor_id
    
    if (!sellerId) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        'Seller authentication required'
      )
    }

    // Get cached data from preview step
    // Note: In production, use Redis or database instead of in-memory cache
    const cachedData = importCache.get(transactionId)
    
    if (!cachedData) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        'Import session expired or not found. Please upload the file again.'
      )
    }

    // Verify seller owns this import
    if (cachedData.sellerId !== sellerId) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        'Unauthorized to confirm this import'
      )
    }

    const { rows } = cachedData
    
    console.log(`📦 Seller ${sellerId} confirming import of ${rows.length} products...`)

    // Set initial status
    importStatusCache.set(transactionId, {
      status: 'processing'
    })

    // Return immediately and process in background
    res.status(202).json({
      success: true,
      message: `Import started: processing ${rows.length} products in background`,
      summary: {
        total: rows.length,
        status: 'processing'
      }
    })

    // Process in background (don't await)
    processImportInBackground(rows, sellerId, req.scope, transactionId).catch((error) => {
      console.error('❌ Background import failed:', error)
      importStatusCache.set(transactionId, {
        status: 'failed',
        error: error.message,
        completedAt: Date.now()
      })
    })

  } catch (error: any) {
    console.error('❌ Import confirmation failed:', error)
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to confirm import'
    })
  }
}

/**
 * Process import in background
 */
async function processImportInBackground(
  rows: any[],
  sellerId: string,
  scope: any,
  transactionId: string
) {
  const created: any[] = []
  const skipped: any[] = []
  const errors: any[] = []

  // Check which SKUs already exist (to skip duplicates)
  const inventoryService = scope.resolve(Modules.INVENTORY)
  const allSkus = rows.map(r => r['SKU']).filter(Boolean)
  const existingSkuSet = new Set<string>()
  
  try {
    const existingItems = await inventoryService.listInventoryItems({
      sku: allSkus
    })
    existingItems.forEach((item: any) => {
      if (item.sku) existingSkuSet.add(item.sku)
    })
    console.log(`📦 Found ${existingSkuSet.size} existing SKUs to skip`)
  } catch (error) {
    console.warn('Could not check existing SKUs:', error.message)
  }

  // Get seller's sales channel and stock location
  // IMPORTANT: sellerId from auth is actually the MEMBER ID (mem_xxx)
  // We need to get the actual SELLER ID (sel_xxx) for linking
  const sellerService = scope.resolve(SELLER_MODULE)
  const salesChannelService = scope.resolve(Modules.SALES_CHANNEL)
  const stockLocationService = scope.resolve(Modules.STOCK_LOCATION)
  
  let actualSellerId = null
  let salesChannelId = null
  let stockLocationId = null
  
  try {
    // Get the seller entity - for now, just get the first seller
    // In a multi-seller system, you'd need to query the link between member and seller
    // TODO: Implement proper member-to-seller relationship lookup via link service
    const allSellers = await sellerService.listSellers({})
    
    if (allSellers?.[0]?.id) {
      actualSellerId = allSellers[0].id
      console.log(`📦 Member ID (from auth): ${sellerId}`)
      console.log(`📦 Seller ID: ${actualSellerId}`)
      console.log(`📦 Seller Name: ${allSellers[0].name}`)
    } else {
      console.error(`❌ CRITICAL: No sellers found in system!`)
      console.error(`   Run 'npm run seed' to create a seller first.`)
      console.error(`   Aborting import...`)
      return
    }
    
    // Get the default sales channel (created during seed)
    const salesChannels = await salesChannelService.listSalesChannels({
      name: 'Default Sales Channel'
    })
    
    if (salesChannels?.[0]?.id) {
      salesChannelId = salesChannels[0].id
      console.log(`✅ Using sales channel: ${salesChannelId} (${salesChannels[0].name})`)
    } else {
      console.error(`❌ CRITICAL: No sales channel found!`)
      console.error(`   Aborting import...`)
      return
    }
    
    // Get stock locations for this seller
    const stockLocations = await stockLocationService.listStockLocations({
      name: {
        $like: `%${sellerId}%`
      }
    })
    
    if (stockLocations?.[0]?.id) {
      stockLocationId = stockLocations[0].id
      console.log(`✅ Using stock location: ${stockLocationId} (${stockLocations[0].name})`)
    } else {
      console.warn(`⚠️  No stock location found for seller ${sellerId}`)
      console.warn(`   Trying to get first available stock location...`)
      
      const allStockLocations = await stockLocationService.listStockLocations({})
      if (allStockLocations?.[0]?.id) {
        stockLocationId = allStockLocations[0].id
        console.log(`✅ Using fallback stock location: ${stockLocationId}`)
      }
    }
  } catch (error: any) {
    console.error('❌ CRITICAL: Could not fetch sales channel/stock location:', error.message)
    console.error('   Aborting import...')
    return
  }

  for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i]
        const rowNum = i + 2

        // Extract core fields
        const title = row['Title'] || row['Item Name']
        const sku = row['SKU']
        const status = row['Status']?.toLowerCase() === 'active' ? 'published' : 'draft'
        const description = row['Product Description'] || ''
        const priceString = row['Your Price GBP (Sell on Amazon, UK)'] || '0'
        const quantity = parseInt(row['Quantity (UK)'] || '0')

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

        // Skip if SKU already exists
        if (existingSkuSet.has(sku)) {
          skipped.push({
            row: rowNum,
            reason: 'SKU already exists',
            sku,
            title
          })
          console.log(`⏭️  Row ${rowNum}: Skipped existing SKU "${sku}"`)
          continue
        }

        // Convert price (remove currency symbols)
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
            // Create safe metadata key
            const metadataKey = key.toLowerCase().replace(/[^a-z0-9]+/g, '_')
            metadata[metadataKey] = value
          }
        }

        // Add seller context (use actual seller ID, not member ID)
        metadata.seller_id = actualSellerId
        metadata.import_source = 'warehouse_csv'
        metadata.import_date = new Date().toISOString()

        // Determine which options to use
        const hasSize = row['Size'] && row['Size'].trim() !== ''
        const hasColor = row['Colour'] && row['Colour'].trim() !== ''

        // Build product options array with VALUES
        const productOptions: any[] = []
        const variantOptions: Record<string, string> = {}
        
        if (hasSize) {
          productOptions.push({ 
            title: 'Size',
            values: [row['Size']] // Define the value at product level
          })
          variantOptions.Size = row['Size']
        }
        if (hasColor) {
          productOptions.push({ 
            title: 'Color',
            values: [row['Colour']] // Define the value at product level
          })
          variantOptions.Color = row['Colour']
        }

        // Build variant object
        const variantData: any = {
          title: row['Size'] || row['Colour'] || 'Default',
          sku,
          manage_inventory: true,
          allow_backorder: false,
          inventory_quantity: quantity,
          prices: [
            {
              amount: Math.round(price * 100), // Convert to cents
              currency_code: 'gbp'
            }
          ],
          metadata: {
            ...metadata,
            variant_sku: sku
          }
        }
        
        // Only add options if they exist
        if (Object.keys(variantOptions).length > 0) {
          variantData.options = variantOptions
        }

        // Build product object
        const productData: any = {
          title,
          subtitle: row['Bullet Point'] || '',
          description,
          status,
          is_giftcard: false,
          discountable: true,
          handle: `${sku.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
          weight,
          metadata,
          variants: [variantData]
        }
        
        // Only add options if they exist
        if (productOptions.length > 0) {
          productData.options = productOptions
        }
        
        // Only add images if they exist
        if (row['Main Image URL']) {
          productData.images = [{ url: row['Main Image URL'] }]
        }
        
        // Add sales channel if available
        if (salesChannelId) {
          productData.sales_channels = [{ id: salesChannelId }]
        }

        // Create product via workflow
        const { result } = await createProductsWorkflow.run({
          container: scope,
          input: {
            products: [productData],
            additional_data: {
              seller_id: actualSellerId  // Use actual seller ID, not member ID!
            }
          }
        })

        console.log(`✅ Row ${rowNum}: Created product "${title}" (${sku})`)
        console.log(`   Product ID: ${result[0]?.id}`)
        console.log(`   Sales Channel Linked: ${salesChannelId ? 'YES ✅' : 'NO ❌'}`)
        console.log(`   Variants: ${result[0]?.variants?.length || 0}`)

        // Explicitly link product to seller using the actual SELLER ID
        try {
          const link = scope.resolve(ContainerRegistrationKeys.LINK)
          await link.create({
            [SELLER_MODULE]: {
              seller_id: actualSellerId  // Use actual seller ID, not member ID!
            },
            [Modules.PRODUCT]: {
              product_id: result[0].id
            }
          })
          console.log(`  🔗 Linked product to seller (${actualSellerId})`)
        } catch (linkError: any) {
          console.warn(`  ⚠️  Could not link product to seller: ${linkError.message}`)
        }

        // Create inventory levels at stock location if available
        if (stockLocationId && quantity > 0 && result[0]?.variants?.[0]?.id) {
          try {
            const inventoryService = scope.resolve(Modules.INVENTORY)
            const variant = result[0].variants[0]
            
            // Get inventory item for this variant
            const inventoryItems = await inventoryService.listInventoryItems({
              sku: variant.sku
            })
            
            if (inventoryItems?.[0]?.id) {
              // Create inventory level at stock location
              await createInventoryLevelsWorkflow.run({
                container: scope,
                input: {
                  inventory_levels: [{
                    inventory_item_id: inventoryItems[0].id,
                    location_id: stockLocationId,
                    stocked_quantity: quantity
                  }]
                }
              })
              console.log(`  📦 Set inventory: ${quantity} units at stock location`)
            }
          } catch (invError) {
            console.warn(`  ⚠️  Could not set inventory: ${invError.message}`)
          }
        }

        created.push({
          row: rowNum,
          sku,
          title,
          product_id: result[0]?.id
        })

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

  // Clean up cache after import
  importCache.delete(transactionId)

  const total = rows.length
  const successRate = total > 0 ? ((created.length / total) * 100).toFixed(1) : '0'

  const summary = {
    total,
    created: created.length,
    skipped: skipped.length,
    errors: errors.length,
    successRate: `${successRate}%`
  }

  // Save completion status
  importStatusCache.set(transactionId, {
    status: 'completed',
    summary,
    completedAt: Date.now()
  })

  // Send notification
  try {
    const notificationService = scope.resolve(Modules.NOTIFICATION)
    await notificationService.create({
      to: sellerId, // Seller ID
      channel: 'seller_feed',
      template: 'product-import-completed',
      data: {
        transaction_id: transactionId,
        summary,
        message: `Import completed: ${created.length}/${total} products created successfully`
      }
    })
    console.log(`  📬 Notification sent to seller`)
  } catch (notifError: any) {
    console.warn(`  ⚠️  Could not send notification: ${notifError.message}`)
  }

  console.log(`\n📊 Background Import Complete:`)
  console.log(`   Total: ${total}`)
  console.log(`   Created: ${created.length}`)
  console.log(`   Skipped: ${skipped.length}`)
  console.log(`   Errors: ${errors.length}`)
  console.log(`   Success Rate: ${successRate}%\n`)
}

