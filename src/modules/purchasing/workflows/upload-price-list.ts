/**
 * Flexible Price List Upload Workflow
 *
 * Supports multiple file formats (CSV, fixed-width) with dynamic parser selection
 * based on supplier configuration and file content detection.
 *
 * @see TEM-150 - Phase 2: Workflow Integration
 * @see TEM-159 - Update Upload Workflow
 */

import { createWorkflow, WorkflowResponse, when, transform } from "@medusajs/workflows-sdk"
import { createPriceListStep } from "../steps/create-price-list"
import { processPriceListItemsStep } from "../steps/process-price-list-items"
import { detectParserConfigStep } from "../steps/detect-parser-config"
import { parseCsvPriceListStep } from "../steps/parse-csv-price-list-flexible"
import { parseFixedWidthPriceListStep } from "../steps/parse-fixed-width-price-list"

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
  upload_filename?: string
}

export const uploadPriceListWorkflow = createWorkflow(
  "upload-price-list-workflow",
  (input: WorkflowInput) => {
    // Step 1: Detect parser configuration
    // Resolves config from: supplier metadata → templates → auto-detection
    const parserConfig = detectParserConfigStep({
      supplier_id: input.supplier_id,
      file_name: input.file_name,
      file_content: input.file_content
    })

    // Step 2: Parse file based on detected config
    // Conditionally execute CSV or fixed-width parser
    // Using two when-then blocks for if-else logic (Medusa v2 pattern)
    const csvParseResult = when(
      "parse-csv",
      { parserConfig },
      ({ parserConfig }) => parserConfig.type === 'csv'
    ).then(() => {
      // CSV parser path
      return parseCsvPriceListStep({
        file_content: input.file_content,
        supplier_id: input.supplier_id,
        brand_id: input.brand_id,
        config: transform({ parserConfig }, ({ parserConfig }) => parserConfig.config)
      })
    })

    const fixedWidthParseResult = when(
      "parse-fixed-width",
      { parserConfig },
      ({ parserConfig }) => parserConfig.type !== 'csv'
    ).then(() => {
      // Fixed-width parser path
      return parseFixedWidthPriceListStep({
        file_content: input.file_content,
        supplier_id: input.supplier_id,
        brand_id: input.brand_id,
        config: transform({ parserConfig }, ({ parserConfig }) => parserConfig.config)
      })
    })

    // Merge results - only one will have data based on parser type
    const parseResult = transform(
      { csvParseResult, fixedWidthParseResult },
      ({ csvParseResult, fixedWidthParseResult }) => csvParseResult || fixedWidthParseResult
    )

    // Step 3: Create price list with enhanced metadata
    const { price_list } = createPriceListStep({
      supplier_id: input.supplier_id,
      name: input.name,
      description: input.description,
      effective_date: input.effective_date,
      expiry_date: input.expiry_date,
      currency_code: input.currency_code,
      brand_id: input.brand_id,
      upload_filename: input.upload_filename || input.file_name,
      upload_metadata: transform({ parseResult, parserConfig }, ({ parseResult, parserConfig }) => ({
        parser_config: parserConfig,
        import_summary: {
          total_rows: parseResult.total_rows,
          processed_rows: parseResult.processed_rows,
          error_count: parseResult.errors?.length || 0
        },
        upload_timestamp: new Date().toISOString()
      }))
    })

    // Step 4: Process price list items
    const { items: processedItems } = processPriceListItemsStep({
      price_list_id: price_list.id,
      items: transform({ parseResult }, ({ parseResult }) => parseResult.items)
    })

    // Step 5: Build comprehensive response with import summary
    return new WorkflowResponse(
      transform({ price_list, processedItems, parseResult, parserConfig },
      ({ price_list, processedItems, parseResult, parserConfig }) => ({
        price_list,
        items: processedItems,
        import_summary: {
          total_rows: parseResult.total_rows,
          processed_rows: parseResult.processed_rows,
          success_count: processedItems.length,
          error_count: parseResult.errors?.length || 0,
          errors: parseResult.errors || [],
          warnings: parseResult.warnings || []
        },
        parser_config: parserConfig
      }))
    )
  }
)
