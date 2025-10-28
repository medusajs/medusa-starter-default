/**
 * Price List Upload Workflow with Wizard Config
 *
 * Accepts wizard-based configuration (parse_config + column_mapping) for price list imports.
 * Supports CSV and fixed-width formats with explicit column mapping.
 *
 * @see TEM-306 - Update Import Route to Accept Wizard Config
 */

import { createWorkflow, WorkflowResponse, when, transform } from "@medusajs/workflows-sdk"
import { createPriceListStep } from "../steps/create-price-list"
import { processPriceListItemsStep } from "../steps/process-price-list-items"
import { parseCsvPriceListStep } from "../steps/parse-csv-price-list-flexible"
import { parseFixedWidthPriceListStep } from "../steps/parse-fixed-width-price-list"
import { calculateDiscountAndNetPriceStep } from "../steps/calculate-discount-and-net-price"

type ParseConfig = {
  format_type: 'csv' | 'fixed-width'
  delimiter?: string
  quote_char?: string
  has_header?: boolean
  skip_rows?: number
  fixed_width_columns?: Array<{
    name: string
    start: number
    width: number
  }>
}

type WorkflowInput = {
  supplier_id: string
  name: string
  description?: string
  effective_date?: Date
  expiry_date?: Date
  currency_code?: string
  brand_id?: string
  file_content: string
  file_name: string
  parse_config: ParseConfig
  column_mapping: Record<string, string>
}

export const uploadPriceListWorkflow = createWorkflow(
  "upload-price-list-workflow",
  (input: WorkflowInput) => {
    // Step 1: Parse file based on provided config
    // Conditionally execute CSV or fixed-width parser based on format_type
    const csvParseResult = when(
      "parse-csv",
      { parse_config: input.parse_config },
      ({ parse_config }) => parse_config.format_type === 'csv'
    ).then(() => {
      // CSV parser path
      return parseCsvPriceListStep({
        file_content: input.file_content,
        supplier_id: input.supplier_id,
        brand_id: input.brand_id,
        config: {
          delimiter: input.parse_config.delimiter || ',',
          quote_char: input.parse_config.quote_char || '"',
          has_header: input.parse_config.has_header ?? true,
          skip_rows: input.parse_config.skip_rows || 0,
          column_mapping: input.column_mapping,
        }
      })
    })

    const fixedWidthParseResult = when(
      "parse-fixed-width",
      { parse_config: input.parse_config },
      ({ parse_config }) => parse_config.format_type !== 'csv'
    ).then(() => {
      // Fixed-width parser path
      return parseFixedWidthPriceListStep({
        file_content: input.file_content,
        supplier_id: input.supplier_id,
        brand_id: input.brand_id,
        config: {
          columns: input.parse_config.fixed_width_columns || [],
          skip_rows: input.parse_config.skip_rows || 0,
          column_mapping: input.column_mapping,
        }
      })
    })

    // Merge results - only one will have data based on parser type
    const parseResult = transform(
      { csvParseResult, fixedWidthParseResult },
      ({ csvParseResult, fixedWidthParseResult }) => csvParseResult || fixedWidthParseResult
    )

    // Step 2: Calculate discounts and net prices
    // Runs after parsing, before saving to database
    const calculatedItems = calculateDiscountAndNetPriceStep({
      items: transform({ parseResult }, ({ parseResult }) => parseResult.items),
      supplier_id: input.supplier_id
    })

    // Step 3: Create price list with enhanced metadata
    const { price_list } = createPriceListStep({
      supplier_id: input.supplier_id,
      name: input.name,
      description: input.description,
      effective_date: input.effective_date,
      expiry_date: input.expiry_date,
      currency_code: input.currency_code,
      brand_id: input.brand_id,
      upload_filename: input.file_name,
      upload_metadata: transform({ parseResult }, ({ parseResult }) => ({
        parse_config: input.parse_config,
        column_mapping: input.column_mapping,
        import_summary: {
          total_rows: parseResult.total_rows,
          processed_rows: parseResult.processed_rows,
          error_count: parseResult.errors?.length || 0
        },
        upload_timestamp: new Date().toISOString()
      }))
    })

    // Step 5: Process price list items with calculated prices
    const { items: processedItems } = processPriceListItemsStep({
      price_list_id: price_list.id,
      items: transform({ calculatedItems }, ({ calculatedItems }) => calculatedItems.items)
    })

    // Step 5: Build comprehensive response with import summary
    return new WorkflowResponse(
      transform({ price_list, processedItems, parseResult },
      ({ price_list, processedItems, parseResult }) => ({
        price_list,
        items: processedItems,
        import_summary: {
          total_rows: parseResult.total_rows,
          processed_rows: parseResult.processed_rows,
          success_count: processedItems.length,
          error_count: parseResult.errors?.length || 0,
          errors: parseResult.errors || [],
          warnings: parseResult.warnings || []
        }
      }))
    )
  }
)
