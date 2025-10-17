/**
 * Parser Preview Route
 *
 * Endpoint for previewing parsed data before full import using MedusaJS workflow pattern
 *
 * @see TEM-160 - Create Parser Config API Routes
 * @see TEM-163 - Create Parser Preview Route
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { previewPriceListParserWorkflow } from "../../../../../../modules/purchasing/workflows/preview-price-list-parser"
import type { ParserConfig, ParseResult } from "../../../../../../modules/purchasing/types/parser-types"
import { z } from "zod"

// Validation schema
const previewSchema = z.object({
  file_content: z.string().min(1, "File content is required"),
  config: z.object({
    type: z.enum(["csv", "fixed-width"]),
    template_name: z.string().optional(),
    config: z.any(), // CsvConfig or FixedWidthConfig
  }),
})

type PreviewParserParams = {
  id: string
}

/**
 * POST /admin/suppliers/:id/parser-config/preview
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
    const validatedData = previewSchema.parse(req.body)
    const parserConfig = validatedData.config as ParserConfig

    // Limit preview to first 10 rows for performance
    const lines = validatedData.file_content.split('\n')
    const previewContent = lines.slice(0, 12).join('\n') // Header + ~10 data rows

    // Run the preview workflow
    const { result } = await previewPriceListParserWorkflow(req.scope).run({
      input: {
        supplier_id: supplierId,
        file_content: previewContent,
        parser_config: parserConfig,
      }
    })

    // Cast result to ParseResult type
    const parseResult = result as ParseResult

    // Extract detected fields from first item
    const detectedFields = parseResult.items.length > 0
      ? Object.keys(parseResult.items[0]).filter(key => parseResult.items[0][key] !== undefined && parseResult.items[0][key] !== null)
      : []

    res.status(200).json({
      preview_rows: parseResult.items.slice(0, 10),
      detected_fields: detectedFields,
      warnings: parseResult.warnings || [],
      errors: parseResult.errors || [],
      total_rows_previewed: Math.min(10, parseResult.items.length),
      parser_type_detected: parserConfig.type,
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
