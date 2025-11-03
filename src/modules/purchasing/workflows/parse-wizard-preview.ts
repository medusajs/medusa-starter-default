/**
 * Parse Wizard Preview Workflow
 *
 * Previews the first 5-10 rows of a file with a given parser configuration
 * without creating any data in the database. Used by the import wizard.
 *
 * @see TEM-300 - Create Parse Preview API Endpoint
 */

import { createWorkflow, WorkflowResponse } from "@medusajs/workflows-sdk"
import { parseRawContentStep } from "../steps/parse-raw-content"

type ParseWizardPreviewInput = {
  supplier_id: string
  file_content: string
  format_type: 'csv' | 'fixed-width'
  parse_config: {
    delimiter?: string
    quote_char?: string
    has_header?: boolean
    skip_rows?: number
    fixed_width_columns?: Array<{
      name: string
      start: number
      width: number
    }>
    transformations?: Record<string, {
      type: 'divide' | 'date' | 'substring' | 'trim_zeros'
      divisor?: number
      input_format?: string
      start?: number
      length?: number
    }>
  }
  column_mapping?: Record<string, string>
}

export const parseWizardPreviewWorkflow = createWorkflow(
  "parse-wizard-preview-workflow",
  (input: ParseWizardPreviewInput) => {
    // Parse the file content based on format type
    // This step does NOT perform product lookups, just raw parsing
    const parseResult = parseRawContentStep({
      file_content: input.file_content,
      format_type: input.format_type,
      parse_config: input.parse_config,
      column_mapping: input.column_mapping,
    })

    return new WorkflowResponse(parseResult)
  }
)
