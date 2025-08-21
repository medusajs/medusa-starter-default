/**
 * Backfill supplier brands from existing SupplierProduct relationships
 * 
 * This script infers which brands a supplier works with by examining their 
 * existing SupplierProduct relationships and the brand assignments of those products' variants.
 */

import { ContainerRegistrationKeys, remoteQueryObjectFromString } from "@medusajs/framework/utils"
import { MedusaContainer } from "@medusajs/framework/types"
import BrandsModule from "../modules/brands"
import { PURCHASING_MODULE } from "../modules/purchasing"

interface BackfillOptions {
  dryRun?: boolean
  batchSize?: number
  logLevel?: 'info' | 'debug' | 'error'
  supplierLimit?: number
  minVariantThreshold?: number
}

interface BackfillResult {
  processed: number
  updated: number
  skipped: number
  errors: string[]
  summary: {
    suppliersWithProducts: number
    suppliersWithoutProducts: number
    totalBrandLinks: number
    brandsBySupplier: Record<string, number>
  }
}

export async function backfillSupplierBrands(
  container: MedusaContainer,
  options: BackfillOptions = {}
): Promise<BackfillResult> {
  const {
    dryRun = false,
    batchSize = 20,
    logLevel = 'info',
    supplierLimit = 500,
    minVariantThreshold = 1  // Minimum variants required to establish brand relationship
  } = options

  const query = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  
  const result: BackfillResult = {
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    summary: {
      suppliersWithProducts: 0,
      suppliersWithoutProducts: 0,
      totalBrandLinks: 0,
      brandsBySupplier: {}
    }
  }

  const log = (level: string, message: string, ...args: any[]) => {
    if (logLevel === 'debug' || level === 'error' || (level === 'info' && logLevel !== 'error')) {
      console.log(`[${new Date().toISOString()}] [${level.toUpperCase()}]`, message, ...args)
    }
  }

  log('info', `Starting supplier brand backfill (dry-run: ${dryRun})`)

  try {
    // Step 1: Get all suppliers
    log('info', 'Fetching suppliers...')
    
    const suppliersQuery = remoteQueryObjectFromString({
      entryPoint: "supplier",
      fields: ["id", "name", "code"],
      variables: {
        limit: supplierLimit,
        order: { created_at: "ASC" }
      },
    })

    const suppliers = await query(suppliersQuery)
    
    if (!suppliers || suppliers.length === 0) {
      log('info', 'No suppliers found')
      return result
    }

    log('info', `Found ${suppliers.length} suppliers to process`)

    // Process suppliers in batches
    for (let i = 0; i < suppliers.length; i += batchSize) {
      const batch = suppliers.slice(i, i + batchSize)
      
      log('debug', `Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(suppliers.length/batchSize)}`)

      for (const supplier of batch) {
        result.processed++
        
        try {
          log('debug', `Processing supplier ${supplier.id} (${supplier.name})`)

          // Step 2: Get all SupplierProducts for this supplier
          const supplierProductsQuery = remoteQueryObjectFromString({
            entryPoint: "supplier_product", 
            fields: ["id", "supplier_id", "product_variant_id"],
            variables: {
              filters: { supplier_id: supplier.id },
              limit: 1000,
            },
          })

          const supplierProducts = await query(supplierProductsQuery)
          
          if (!supplierProducts || supplierProducts.length === 0) {
            log('debug', `Supplier ${supplier.id} has no products, skipping`)
            result.summary.suppliersWithoutProducts++
            result.skipped++
            continue
          }

          result.summary.suppliersWithProducts++
          
          // Step 3: Get all unique variant IDs for this supplier
          const variantIds = [...new Set(supplierProducts.map((sp: any) => sp.product_variant_id))]
          log('debug', `Supplier ${supplier.id} has ${variantIds.length} unique variants`)

          // Step 4: Get brand information for all these variants
          const variantsQuery = remoteQueryObjectFromString({
            entryPoint: "product_variant",
            fields: ["id", "brand.id", "brand.name", "brand.code"],
            variables: {
              filters: { id: { $in: variantIds } },
              limit: 1000,
            },
          })

          const variants = await query(variantsQuery)
          
          if (!variants || variants.length === 0) {
            log('debug', `No variant data found for supplier ${supplier.id}`)
            result.skipped++
            continue
          }

          // Step 5: Aggregate brands and count variants per brand
          const brandCounts = new Map<string, { brand: any, count: number }>()
          
          for (const variant of variants) {
            if (variant.brand?.id) {
              const brandId = variant.brand.id
              if (brandCounts.has(brandId)) {
                brandCounts.get(brandId)!.count++
              } else {
                brandCounts.set(brandId, {
                  brand: variant.brand,
                  count: 1
                })
              }
            }
          }

          if (brandCounts.size === 0) {
            log('debug', `Supplier ${supplier.id} has no variants with brands assigned, skipping`)
            result.skipped++
            continue
          }

          // Step 6: Filter brands that meet the minimum threshold
          const qualifyingBrands = Array.from(brandCounts.entries())
            .filter(([_, data]) => data.count >= minVariantThreshold)
            .map(([brandId, data]) => ({ brandId, ...data }))

          if (qualifyingBrands.length === 0) {
            log('debug', `Supplier ${supplier.id} has no brands meeting threshold (${minVariantThreshold}), skipping`)
            result.skipped++
            continue
          }

          log('debug', `Supplier ${supplier.id} qualifies for ${qualifyingBrands.length} brands:`)
          qualifyingBrands.forEach(({ brand, count }) => {
            log('debug', `  - ${brand.name} (${brand.code}): ${count} variants`)
          })

          // Step 7: Check existing supplier-brand links
          const existingLinksQuery = remoteQueryObjectFromString({
            entryPoint: "supplier_brand",
            fields: ["supplier_id", "brand_id"],
            variables: {
              filters: { supplier_id: supplier.id },
              limit: 100,
            },
          })

          const existingLinks = await query(existingLinksQuery)
          const existingBrandIds = new Set(existingLinks?.map((link: any) => link.brand_id) || [])

          // Step 8: Create missing links
          let linksCreated = 0
          for (const { brandId, brand } of qualifyingBrands) {
            if (existingBrandIds.has(brandId)) {
              log('debug', `Supplier ${supplier.id} already linked to brand ${brand.name}, skipping`)
              continue
            }

            if (!dryRun) {
              try {
                await link.create({
                  [PURCHASING_MODULE]: supplier.id,
                  [BrandsModule.linkable.brand.serviceName]: brandId
                })
              } catch (linkError) {
                // Try alternative approach if first fails
                await link.create({
                  supplier_id: supplier.id,
                  brand_id: brandId
                })
              }
            }

            linksCreated++
            result.summary.totalBrandLinks++
            log('debug', `${dryRun ? '[DRY RUN]' : ''} Linked supplier ${supplier.id} to brand ${brand.name} (${brand.code})`)
          }

          if (linksCreated > 0) {
            result.updated++
            result.summary.brandsBySupplier[supplier.id] = linksCreated
            log('info', `${dryRun ? '[DRY RUN]' : ''} Created ${linksCreated} brand links for supplier ${supplier.name}`)
          } else {
            result.skipped++
          }

        } catch (supplierError) {
          const errorMsg = `Failed to process supplier ${supplier.id}: ${supplierError.message}`
          result.errors.push(errorMsg)
          log('error', errorMsg)
        }
      }

      // Small delay between batches
      if (i + batchSize < suppliers.length) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

  } catch (error) {
    const errorMsg = `Backfill process failed: ${error.message}`
    result.errors.push(errorMsg)
    log('error', errorMsg)
    throw error
  }

  // Final summary
  log('info', '=== Supplier Brands Backfill Summary ===')
  log('info', `Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  log('info', `Suppliers processed: ${result.processed}`)
  log('info', `Suppliers with products: ${result.summary.suppliersWithProducts}`)
  log('info', `Suppliers without products: ${result.summary.suppliersWithoutProducts}`)
  log('info', `Suppliers updated: ${result.updated}`)
  log('info', `Total brand links created: ${result.summary.totalBrandLinks}`)
  log('info', `Records skipped: ${result.skipped}`)
  log('info', `Errors: ${result.errors.length}`)

  if (result.errors.length > 0) {
    log('error', 'Errors encountered:')
    result.errors.forEach(error => log('error', `  - ${error}`))
  }

  log('info', 'Supplier brands backfill completed')
  
  return result
}

// CLI usage
if (require.main === module) {
  const { medusaIntegrationTestRunner } = require("medusa-test-utils")
  
  medusaIntegrationTestRunner({
    testSuite: async ({ container }) => {
      const args = process.argv.slice(2)
      const dryRun = args.includes('--dry-run')
      const debug = args.includes('--debug')
      const supplierLimit = args.find(arg => arg.startsWith('--limit='))?.split('=')[1]
      const threshold = args.find(arg => arg.startsWith('--threshold='))?.split('=')[1]
      
      console.log('Starting supplier brands backfill...')
      console.log(`Arguments: ${args.join(' ')}`)
      
      try {
        const result = await backfillSupplierBrands(container, {
          dryRun,
          logLevel: debug ? 'debug' : 'info',
          supplierLimit: supplierLimit ? parseInt(supplierLimit) : 500,
          minVariantThreshold: threshold ? parseInt(threshold) : 1
        })
        
        process.exit(result.errors.length > 0 ? 1 : 0)
      } catch (error) {
        console.error('Backfill failed:', error)
        process.exit(1)
      }
    },
  })
}