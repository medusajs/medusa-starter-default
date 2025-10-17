/**
 * Preview Price List Parser Workflow
 *
 * Previews the first 10 rows of a file with a given parser configuration
 * without creating any data in the database.
 *
 * @see TEM-163 - Create Parser Preview Route
 */

import { createWorkflow, WorkflowResponse } from "@medusajs/workflows-sdk"
import { parseCsvPriceListStep } from "../steps/parse-csv-price-list-flexible"
import { parseFixedWidthPriceListStep } from "../steps/parse-fixed-width-price-list"
import { ParserConfig } from "../types/parser-types"

type PreviewWorkflowInput = {
  supplier_id: string
  file_content: string
  parser_config: ParserConfig
}

export const previewPriceListParserWorkflow = createWorkflow(
  "preview-price-list-parser-workflow",
  (input: PreviewWorkflowInput) => {
    // Parse the file content based on parser config type
    const parseResult = input.parser_config.type === 'csv'
      ? parseCsvPriceListStep({
          file_content: input.file_content,
          supplier_id: input.supplier_id,
          config: input.parser_config.config,
        })
      : parseFixedWidthPriceListStep({
          file_content: input.file_content,
          supplier_id: input.supplier_id,
          config: input.parser_config.config,
        })

    return new WorkflowResponse(parseResult)
  }
)
