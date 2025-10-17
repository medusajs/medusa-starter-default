import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { syncVariantPricesFromSupplierWorkflow } from "../../../../../../../workflows/pricing"
import { PURCHASING_MODULE } from "../../../../../../../modules/purchasing"
import PurchasingService from "../../../../../../../modules/purchasing/service"

type SyncPricesParams = {
  id: string
  priceListId: string
}

type SyncPricesRequest = {
  force_sync?: boolean
  dry_run?: boolean
}

type SyncPricesResponse = {
  success: boolean
  updated_count: number
  items_processed: number
  dry_run: boolean
  summary?: {
    total_items: number
    variants_to_update: number
    synced: number
    skipped: number
    errors: number
  }
  error?: string
  message?: string
}

/**
 * POST /admin/suppliers/:id/price-lists/:priceListId/sync-prices
 *
 * Manually trigger price synchronization from supplier price list to product variants.
 *
 * This endpoint:
 * - Syncs gross prices from supplier price list items to variant selling prices
 * - Resolves multi-supplier conflicts using priority system
 * - Supports dry-run mode for previewing changes
 * - Provides detailed sync status and statistics
 *
 * @param force_sync - Override existing prices even if another supplier has higher priority
 * @param dry_run - Preview changes without actually updating prices
 */
export const POST = async (
  req: MedusaRequest<SyncPricesParams, {}, SyncPricesRequest>,
  res: MedusaResponse<SyncPricesResponse>
) => {
  const startTime = Date.now()
  const { id: supplierId, priceListId } = req.params
  const { force_sync = false, dry_run = false } = req.body

  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  try {
    // Validate price list exists and belongs to supplier
    const priceList = await purchasingService.retrieveSupplierPriceList(priceListId)

    if (!priceList) {
      console.warn(`[Price Sync] Price list not found: ${priceListId}`)
      return res.status(404).json({
        success: false,
        updated_count: 0,
        items_processed: 0,
        dry_run,
        error: "Price list not found",
        message: `No price list found with ID: ${priceListId}`
      })
    }

    if (priceList.supplier_id !== supplierId) {
      console.warn(`[Price Sync] Price list ${priceListId} does not belong to supplier ${supplierId}`)
      return res.status(400).json({
        success: false,
        updated_count: 0,
        items_processed: 0,
        dry_run,
        error: "Invalid price list",
        message: "Price list does not belong to the specified supplier"
      })
    }

    // Log sync operation start
    console.log(`[Price Sync] Starting ${dry_run ? 'dry-run ' : ''}sync for price list ${priceListId}`, {
      supplier_id: supplierId,
      price_list_id: priceListId,
      force_sync,
      dry_run,
      timestamp: new Date().toISOString()
    })

    // Execute the sync workflow
    const { result } = await syncVariantPricesFromSupplierWorkflow(req.scope).run({
      input: {
        supplier_price_list_id: priceListId,
        force_sync,
        dry_run
      }
    })

    const duration = Date.now() - startTime

    // Log sync operation completion
    console.log(`[Price Sync] ${dry_run ? 'Dry-run ' : ''}Sync completed for price list ${priceListId}`, {
      supplier_id: supplierId,
      price_list_id: priceListId,
      duration_ms: duration,
      summary: result.summary,
      timestamp: new Date().toISOString()
    })

    res.json({
      success: true,
      updated_count: result.updated_variants?.length || 0,
      items_processed: result.items_processed?.length || 0,
      dry_run: result.dry_run || false,
      summary: result.summary
    })

  } catch (error) {
    const duration = Date.now() - startTime

    // Log detailed error information
    console.error(`[Price Sync] Failed to sync prices for price list ${priceListId}`, {
      supplier_id: supplierId,
      price_list_id: priceListId,
      force_sync,
      dry_run,
      duration_ms: duration,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })

    res.status(500).json({
      success: false,
      updated_count: 0,
      items_processed: 0,
      dry_run,
      error: "Failed to sync prices",
      message: error.message || "An unexpected error occurred during price synchronization"
    })
  }
}
