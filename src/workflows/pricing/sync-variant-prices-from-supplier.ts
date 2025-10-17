import {
  createWorkflow,
  WorkflowResponse,
  when,
  transform
} from "@medusajs/framework/workflows-sdk"
import { upsertVariantPricesWorkflow } from "@medusajs/medusa/core-flows"
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

    // Step 2: Update variant prices using Medusa's native workflow
    // Only run if not dry_run and there are variants to update
    const updatedVariants = when(input, ({ dry_run }) => !dry_run).then(() => {
      return when(variantsToUpdate, (variants) => variants.length > 0).then(() => {
        // Transform the variants data into the format expected by upsertVariantPricesWorkflow
        const pricesInput = transform(
          { variantsToUpdate },
          ({ variantsToUpdate }) => ({
            variantPrices: variantsToUpdate.map(v => ({
              variant_id: v.variant_id,
              product_id: v.product_id,
              prices: [{
                amount: v.amount,
                currency_code: v.currency_code,
              }]
            })),
            previousVariantIds: variantsToUpdate.map(v => v.variant_id)
          })
        )

        return upsertVariantPricesWorkflow.runAsStep({
          input: pricesInput
        })
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
