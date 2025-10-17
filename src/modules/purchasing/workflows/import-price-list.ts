import {
  createWorkflow,
  WorkflowResponse,
  when,
  transform
} from "@medusajs/workflows-sdk"
import { createPriceListStep } from "../steps/create-price-list"
import { processPriceListItemsStep } from "../steps/process-price-list-items"
import { validateSupplierStep } from "../steps/validate-supplier"
import { createVariantsFromSupplierPartNumbersWorkflow } from "../../../workflows/pricing/create-variants-from-supplier-partnumbers"
import { syncVariantPricesFromSupplierWorkflow } from "../../../workflows/pricing/sync-variant-prices-from-supplier"

type WorkflowInput = {
  supplier_id: string
  name: string
  description?: string
  effective_date?: Date
  expiry_date?: Date
  currency_code?: string
  upload_filename?: string
  upload_metadata?: any
  items: Array<{
    product_variant_id: string
    product_id: string
    supplier_sku?: string
    variant_sku?: string
    cost_price: number
    quantity?: number
    lead_time_days?: number
    notes?: string
  }>
}

export const importPriceListWorkflow = createWorkflow(
  "import-price-list-workflow",
  (input: WorkflowInput) => {
    // Step 1: Validate supplier and get details for configuration
    const { supplier } = validateSupplierStep({ supplier_id: input.supplier_id })

    // Step 2: Create price list
    const { price_list } = createPriceListStep({
      supplier_id: input.supplier_id,
      name: input.name,
      description: input.description,
      effective_date: input.effective_date,
      expiry_date: input.expiry_date,
      currency_code: input.currency_code,
      upload_filename: input.upload_filename,
      upload_metadata: input.upload_metadata
    })

    // Step 3: Process price list items
    const { items } = processPriceListItemsStep({
      price_list_id: price_list.id,
      items: input.items
    })

    // Step 4: Auto-create variants for unknown part numbers (conditional)
    const autoCreateEnabled = transform({ supplier }, (data) => {
      const envEnabled = process.env.AUTO_CREATE_VARIANTS === "true"
      const supplierEnabled = data.supplier?.auto_sync_prices ?? false
      return envEnabled && supplierEnabled
    })

    const createdVariantsResult = when({ autoCreateEnabled }, ({ autoCreateEnabled }) => autoCreateEnabled).then(() => {
      return createVariantsFromSupplierPartNumbersWorkflow.runAsStep({
        input: {
          supplier_price_list_id: price_list.id,
          skip_existing: true
        }
      })
    })

    // Step 5: Sync gross prices to variant selling prices (conditional)
    const autoSyncEnabled = transform({ supplier }, (data) => {
      const envEnabled = process.env.AUTO_SYNC_SUPPLIER_PRICES === "true"
      const supplierEnabled = data.supplier?.auto_sync_prices ?? false
      return envEnabled && supplierEnabled
    })

    const syncPricesResult = when({ autoSyncEnabled }, ({ autoSyncEnabled }) => autoSyncEnabled).then(() => {
      return syncVariantPricesFromSupplierWorkflow.runAsStep({
        input: {
          supplier_price_list_id: price_list.id,
          force_sync: false,
          dry_run: false
        }
      })
    })

    return new WorkflowResponse({
      price_list,
      items,
      created_variants: createdVariantsResult,
      sync_result: syncPricesResult
    })
  }
)