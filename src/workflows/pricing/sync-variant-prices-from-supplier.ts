import {
  createWorkflow,
  WorkflowResponse,
  when,
  transform
} from "@medusajs/framework/workflows-sdk"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import {
  resolveVariantPricingConflictsStep,
  updatePriceListItemSyncStatusStep
} from "./steps"

export type SyncVariantPricesFromSupplierInput = {
  supplier_price_list_id: string
  force_sync?: boolean // Override existing prices even if another supplier has higher priority
  dry_run?: boolean // Don't actually update, just report what would change
}

export const syncVariantPricesFromSupplierWorkflowId =
  "sync-variant-prices-from-supplier"

/**
 * Syncs supplier price list gross prices to product variant selling prices.
 *
 * This workflow:
 * 1. Loads supplier price list items with gross_price
 * 2. Resolves conflicts when multiple suppliers price the same variant
 * 3. Updates variant prices using Medusa's native pricing system
 * 4. Tracks sync status on each price list item
 *
 * @param input - Configuration for the sync operation
 * @returns Summary of updated variants and processed items
 */
export const syncVariantPricesFromSupplierWorkflow = createWorkflow(
  syncVariantPricesFromSupplierWorkflowId,
  (input: SyncVariantPricesFromSupplierInput) => {

    // Step 1: Resolve which variants should be updated and with what prices
    const { variantsToUpdate, itemsToTrack } = resolveVariantPricingConflictsStep(input)

    // Step 2: Update variant prices using updateProductsWorkflow
    // This is the proper Medusa way to update existing variant prices
    const updatedVariants = when(
      { input, variantsToUpdate },
      ({ input, variantsToUpdate }) => !input.dry_run && variantsToUpdate.length > 0
    ).then(() => {
      // Group variants by product_id since updateProductsWorkflow expects products
      const productsInput = transform(
        { variantsToUpdate },
        ({ variantsToUpdate }) => {
          // Group variants by product
          const productMap = new Map()

          for (const v of variantsToUpdate) {
            if (!productMap.has(v.product_id)) {
              productMap.set(v.product_id, {
                id: v.product_id,
                variants: []
              })
            }

            const product = productMap.get(v.product_id)
            product.variants.push({
              id: v.variant_id,
              prices: v.price_id
                ? [{
                    id: v.price_id,
                    amount: v.amount,
                    currency_code: v.currency_code,
                  }]
                : [{
                    amount: v.amount,
                    currency_code: v.currency_code,
                  }]
            })
          }

          return {
            products: Array.from(productMap.values())
          }
        }
      )

      return updateProductsWorkflow.runAsStep({
        input: productsInput
      })
    })

    // Step 3: Update sync tracking on price list items
    updatePriceListItemSyncStatusStep({
      items: itemsToTrack,
      dry_run: input.dry_run
    })

    return new WorkflowResponse({
      updated_variants: updatedVariants,
      items_processed: itemsToTrack,
      dry_run: input.dry_run,
      summary: transform(
        { variantsToUpdate, itemsToTrack },
        ({ variantsToUpdate, itemsToTrack }) => ({
          total_items: itemsToTrack.length,
          variants_to_update: variantsToUpdate.length,
          synced: itemsToTrack.filter(i => i.status === 'synced').length,
          skipped: itemsToTrack.filter(i => i.status === 'skipped').length,
          errors: itemsToTrack.filter(i => i.status === 'error').length,
        })
      )
    })
  }
)
