/**
 * Backfill variant brands from product-level brand assignments
 * 
 * This script assigns brands to variants based on their parent product's brand assignments.
 * If a product has exactly one brand assigned, all its variants will inherit that brand.
 * If a product has multiple brands or no brands, variants are left unchanged.
 */

import { ContainerRegistrationKeys, remoteQueryObjectFromString } from "@medusajs/framework/utils"
import { MedusaContainer } from "@medusajs/framework/types"
import ProductModule from "@medusajs/medusa/product"
import BrandsModule from "../modules/brands"

interface BackfillOptions {
  dryRun?: boolean
  batchSize?: number
  logLevel?: 'info' | 'debug' | 'error'
  productLimit?: number
}

interface BackfillResult {
  processed: number
  updated: number
  skipped: number
  errors: string[]
  summary: {
    singleBrandProducts: number
    multiBrandProducts: number
    noBrandProducts: number
    variantsUpdated: number
  }
}

export async function backfillVariantBrands(
  container: MedusaContainer, 
  options: BackfillOptions = {}
): Promise<BackfillResult> {
  const {
    dryRun = false,
    batchSize = 50,
    logLevel = 'info',
    productLimit = 1000
  } = options

  const query = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  
  const result: BackfillResult = {
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    summary: {
      singleBrandProducts: 0,
      multiBrandProducts: 0,
      noBrandProducts: 0,
      variantsUpdated: 0
    }
  }

  const log = (level: string, message: string, ...args: any[]) => {
    if (logLevel === 'debug' || level === 'error' || (level === 'info' && logLevel !== 'error')) {
      console.log(`[${new Date().toISOString()}] [${level.toUpperCase()}]`, message, ...args)
    }
  }

  log('info', `Starting variant brand backfill (dry-run: ${dryRun})`)

  try {
    // Step 1: Get all products with their brand relationships and variants
    log('info', 'Fetching products with brand relationships...')
    
    const productsQuery = remoteQueryObjectFromString({
      entryPoint: "product",
      fields: [
        "id",
        "title",
        "handle",
        "brands.*",
        "variants.id",
        "variants.title",
        "variants.sku"
      ],
      variables: {
        limit: productLimit,
        order: { created_at: "ASC" }
      },
    })

    const products = await query(productsQuery)
    
    if (!products || products.length === 0) {
      log('info', 'No products found')
      return result
    }

    log('info', `Found ${products.length} products to process`)

    // Process products in batches
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize)
      
      log('debug', `Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(products.length/batchSize)}`)

      for (const product of batch) {
        result.processed++
        
        try {
          const brands = product.brands || []
          const variants = product.variants || []

          if (variants.length === 0) {
            log('debug', `Product ${product.id} (${product.title}) has no variants, skipping`)
            result.skipped++
            continue
          }

          if (brands.length === 0) {
            log('debug', `Product ${product.id} (${product.title}) has no brands, skipping`)
            result.summary.noBrandProducts++
            result.skipped++
            continue
          }

          if (brands.length > 1) {
            log('debug', `Product ${product.id} (${product.title}) has multiple brands (${brands.length}), cannot auto-assign to variants`)
            result.summary.multiBrandProducts++
            result.skipped++
            continue
          }

          // Single brand - assign to all variants
          const brand = brands[0]
          result.summary.singleBrandProducts++

          log('debug', `Product ${product.id} (${product.title}) has single brand ${brand.name} (${brand.code}), assigning to ${variants.length} variants`)

          for (const variant of variants) {
            try {
              // Check if variant already has a brand
              const variantWithBrandQuery = remoteQueryObjectFromString({
                entryPoint: "product_variant",
                fields: ["id", "brand.id"],
                variables: {
                  filters: { id: variant.id },
                  limit: 1,
                },
              })

              const [existingVariant] = await query(variantWithBrandQuery)
              
              if (existingVariant?.brand?.id) {
                log('debug', `Variant ${variant.id} already has brand ${existingVariant.brand.id}, skipping`)
                result.skipped++
                continue
              }

              if (!dryRun) {
                // Create the brand-variant link
                await link.create({
                  [ProductModule.linkable.productVariant.serviceName]: variant.id,
                  [BrandsModule.linkable.brand.serviceName]: brand.id
                })
              }

              result.updated++
              result.summary.variantsUpdated++
              log('debug', `${dryRun ? '[DRY RUN]' : ''} Assigned brand ${brand.name} to variant ${variant.id} (${variant.title})`)

            } catch (variantError) {
              const errorMsg = `Failed to assign brand to variant ${variant.id}: ${variantError.message}`
              result.errors.push(errorMsg)
              log('error', errorMsg)
            }
          }

        } catch (productError) {
          const errorMsg = `Failed to process product ${product.id}: ${productError.message}`
          result.errors.push(errorMsg)
          log('error', errorMsg)
        }
      }

      // Small delay between batches to prevent overwhelming the system
      if (i + batchSize < products.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

  } catch (error) {
    const errorMsg = `Backfill process failed: ${error.message}`
    result.errors.push(errorMsg)
    log('error', errorMsg)
    throw error
  }

  // Final summary
  log('info', '=== Backfill Summary ===')
  log('info', `Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  log('info', `Products processed: ${result.processed}`)
  log('info', `Products with single brand: ${result.summary.singleBrandProducts}`)
  log('info', `Products with multiple brands: ${result.summary.multiBrandProducts}`)
  log('info', `Products with no brands: ${result.summary.noBrandProducts}`)
  log('info', `Variants updated: ${result.summary.variantsUpdated}`)
  log('info', `Records skipped: ${result.skipped}`)
  log('info', `Errors: ${result.errors.length}`)

  if (result.errors.length > 0) {
    log('error', 'Errors encountered:')
    result.errors.forEach(error => log('error', `  - ${error}`))
  }

  log('info', 'Variant brand backfill completed')
  
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
      const productLimit = args.find(arg => arg.startsWith('--limit='))?.split('=')[1]
      
      console.log('Starting variant brands backfill...')
      console.log(`Arguments: ${args.join(' ')}`)
      
      try {
        const result = await backfillVariantBrands(container, {
          dryRun,
          logLevel: debug ? 'debug' : 'info',
          productLimit: productLimit ? parseInt(productLimit) : 1000
        })
        
        process.exit(result.errors.length > 0 ? 1 : 0)
      } catch (error) {
        console.error('Backfill failed:', error)
        process.exit(1)
      }
    },
  })
}