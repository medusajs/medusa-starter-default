import { createWorkflow, WorkflowResponse } from "@medusajs/workflows-sdk"
import { createPriceListStep } from "../steps/create-price-list"
import { processPriceListItemsStep } from "../steps/process-price-list-items"
import { parsePriceListCsvStep } from "../steps/parse-price-list-csv"

type WorkflowInput = {
  supplier_id: string
  name: string
  description?: string
  effective_date?: Date
  expiry_date?: Date
  currency_code?: string
  csv_content: string
  upload_filename: string
}

export const uploadPriceListCsvWorkflow = createWorkflow(
  "upload-price-list-csv-workflow",
  (input: WorkflowInput) => {
    // Parse CSV content
    const { items, errors, total_rows, processed_rows } = parsePriceListCsvStep({
      csv_content: input.csv_content,
      supplier_id: input.supplier_id
    })
    
    // Create price list
    const { price_list } = createPriceListStep({
      supplier_id: input.supplier_id,
      name: input.name,
      description: input.description,
      effective_date: input.effective_date,
      expiry_date: input.expiry_date,
      currency_code: input.currency_code,
      upload_filename: input.upload_filename,
      upload_metadata: {
        total_rows,
        processed_rows,
        errors,
        upload_timestamp: new Date().toISOString()
      }
    })
    
    // Process price list items
    const { items: processedItems } = processPriceListItemsStep({
      price_list_id: price_list.id,
      items: items
    })
    
    return new WorkflowResponse({
      price_list,
      items: processedItems,
      import_summary: {
        total_rows,
        processed_rows,
        errors,
        success_count: processedItems.length
      }
    })
  }
)