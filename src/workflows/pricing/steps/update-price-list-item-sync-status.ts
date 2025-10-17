import {
  createStep,
  StepResponse
} from "@medusajs/framework/workflows-sdk"
import { PURCHASING_MODULE } from "../../../modules/purchasing"

type ItemToTrack = {
  id: string
  status: 'synced' | 'skipped' | 'error'
  error?: string
}

type UpdatePriceListItemSyncStatusInput = {
  items: ItemToTrack[]
  dry_run?: boolean
}

/**
 * Updates the sync status tracking fields on price list items.
 *
 * This step:
 * 1. Updates last_synced_at, sync_status, and sync_error for each item
 * 2. Skips updates if dry_run is true
 * 3. Provides compensation logic to revert status updates on rollback
 */
export const updatePriceListItemSyncStatusStep = createStep(
  "update-price-list-item-sync-status",
  async (input: UpdatePriceListItemSyncStatusInput, { container }) => {
    const purchasingService = container.resolve(PURCHASING_MODULE)
    const logger = container.resolve("logger")

    if (input.dry_run) {
      logger.info(`Dry-run mode: Would update sync status for ${input.items.length} items`)
      return new StepResponse(
        { updated: 0, dry_run: true },
        { items: [], dry_run: true }
      )
    }

    // Store previous state for compensation
    const previousState: Array<{
      id: string
      last_synced_at: Date | null
      sync_status: string | null
      sync_error: string | null
    }> = []

    // Update each item's sync status
    for (const item of input.items) {
      try {
        // Get current state for compensation
        const [currentItem] = await purchasingService.listSupplierPriceListItems({
          id: item.id,
        })

        if (currentItem) {
          previousState.push({
            id: currentItem.id,
            last_synced_at: currentItem.last_synced_at || null,
            sync_status: currentItem.sync_status || null,
            sync_error: currentItem.sync_error || null,
          })
        }

        // Update sync tracking fields
        await purchasingService.updateSupplierPriceListItems(
          { id: item.id },
          {
            last_synced_at: new Date(),
            sync_status: item.status,
            sync_error: item.error || null,
          }
        )
      } catch (error) {
        logger.error(
          `Failed to update sync status for item ${item.id}: ${error}`
        )
      }
    }

    logger.info(`Updated sync status for ${input.items.length} price list items`)

    return new StepResponse(
      { updated: input.items.length, dry_run: false },
      { items: previousState, dry_run: false }
    )
  },
  async (compensationData: { items: Array<{ id: string; last_synced_at: Date | null; sync_status: string | null; sync_error: string | null }>; dry_run: boolean }, { container }) => {
    // Compensation: restore previous sync status
    if (compensationData.dry_run) {
      return
    }

    const purchasingService = container.resolve(PURCHASING_MODULE)
    const logger = container.resolve("logger")

    logger.info(`Rolling back sync status updates for ${compensationData.items.length} items`)

    for (const item of compensationData.items) {
      try {
        await purchasingService.updateSupplierPriceListItems(
          { id: item.id },
          {
            last_synced_at: item.last_synced_at,
            sync_status: item.sync_status,
            sync_error: item.sync_error,
          }
        )
      } catch (error) {
        logger.error(
          `Failed to rollback sync status for item ${item.id}: ${error}`
        )
      }
    }
  }
)
