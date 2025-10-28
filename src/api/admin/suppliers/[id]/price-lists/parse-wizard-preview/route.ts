/**
 * Parse Wizard Preview Route
 *
 * Endpoint for previewing parsed data before full import using wizard configuration
 *
 * @see TEM-300 - Create Parse Preview API Endpoint
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { parseWizardPreviewWorkflow } from "../../../../../../modules/purchasing/workflows/parse-wizard-preview"
import { z } from "zod"

// Validation schema for parse config
const fixedWidthColumnSchema = z.object({
  name: z.string().min(1),
  start: z.number().min(0),
  width: z.number().min(1),
})

const parseConfigSchema = z.object({
  delimiter: z.string().length(1).optional(),
  quote_char: z.string().length(1).optional(),
  has_header: z.boolean().optional(),
  skip_rows: z.number().min(0).optional(),
  fixed_width_columns: z.array(fixedWidthColumnSchema).optional(),
})

const previewRequestSchema = z.object({
  file_content: z.string().min(1, "File content is required"),
  file_type: z.enum(["csv", "txt"]),
  parse_config: parseConfigSchema,
  column_mapping: z.record(z.string(), z.string()).optional(),
})

type PreviewParserParams = {
  id: string
}

/**
 * POST /admin/suppliers/:id/price-lists/parse-wizard-preview
 *
 * Previews how a file would be parsed with the given configuration.
 * Only parses the first 10 data rows to provide fast feedback.
 */
export const POST = async (
  req: MedusaRequest<PreviewParserParams>,
  res: MedusaResponse
) => {
  const { id: supplierId } = req.params

  try {
    // Validate request body
    const validatedData = previewRequestSchema.parse(req.body)

    // Limit preview to first 12 lines (header + ~10 data rows)
    const lines = validatedData.file_content.split('\n')
    const previewContent = lines.slice(0, Math.min(12, lines.length)).join('\n')

    // Determine format type
    const formatType = validatedData.file_type === 'txt' &&
                       validatedData.parse_config.fixed_width_columns &&
                       validatedData.parse_config.fixed_width_columns.length > 0
      ? 'fixed-width'
      : 'csv'

    // Auto-detect delimiter if not provided and format is CSV
    let delimiter = validatedData.parse_config.delimiter
    if (formatType === 'csv' && !delimiter) {
      delimiter = autoDetectDelimiter(previewContent)
    }

    // Run the preview workflow
    const { result } = await parseWizardPreviewWorkflow(req.scope).run({
      input: {
        supplier_id: supplierId,
        file_content: previewContent,
        format_type: formatType,
        parse_config: {
          ...validatedData.parse_config,
          delimiter: delimiter || ',',
        },
        column_mapping: validatedData.column_mapping,
      }
    })

    // Extract detected fields from first item
    const detectedColumns = result.items.length > 0
      ? Object.keys(result.items[0])
      : []

    res.status(200).json({
      detected_format: {
        type: formatType,
        delimiter: formatType === 'csv' ? delimiter : undefined,
        column_count: detectedColumns.length,
        has_header: validatedData.parse_config.has_header ?? true,
      },
      preview_rows: result.items.slice(0, 5),
      detected_columns: detectedColumns,
      warnings: result.warnings || [],
      errors: result.errors || [],
      stats: {
        total_rows_in_file: lines.length - (validatedData.parse_config.skip_rows || 0) - 1,
        rows_previewed: Math.min(5, result.items.length),
      },
    })
  } catch (error: any) {
    console.error(`Error previewing parser config for supplier ${supplierId}:`, error)

    if (error.name === "ZodError") {
      res.status(400).json({
        type: "validation_error",
        message: "Invalid request data",
        errors: error.errors,
      })
      return
    }

    res.status(500).json({
      type: "server_error",
      message: error.message || "Failed to preview parser configuration",
    })
  }
}

/**
 * Auto-detect CSV delimiter by checking first few lines
 * Returns most likely delimiter: comma, semicolon, tab, or pipe
 */
function autoDetectDelimiter(content: string): string {
  const lines = content.split('\n').slice(0, 3).filter(line => line.trim())

  if (lines.length === 0) return ','

  const delimiters = [',', ';', '\t', '|']
  const counts: Record<string, number[]> = {}

  // Count occurrences of each delimiter per line
  for (const delimiter of delimiters) {
    counts[delimiter] = lines.map(line => (line.match(new RegExp(`\\${delimiter}`, 'g')) || []).length)
  }

  // Find delimiter with consistent count across lines and highest average
  let bestDelimiter = ','
  let bestScore = 0

  for (const delimiter of delimiters) {
    const lineCounts = counts[delimiter]
    const avg = lineCounts.reduce((a, b) => a + b, 0) / lineCounts.length

    // Check consistency (all lines have same count)
    const isConsistent = lineCounts.every(count => count === lineCounts[0])

    if (isConsistent && avg > 0 && avg > bestScore) {
      bestScore = avg
      bestDelimiter = delimiter
    }
  }

  return bestDelimiter
}
