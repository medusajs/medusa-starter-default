import { createWorkflow, WorkflowResponse } from "@medusajs/workflows-sdk"
import { createPriceListStep } from "../steps/create-price-list"
import { processPriceListItemsStep } from "../steps/process-price-list-items"

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
    
    const { items } = processPriceListItemsStep({
      price_list_id: price_list.id,
      items: input.items
    })
    
    return new WorkflowResponse({ price_list, items })
  }
)