/**
 * Price List Import Route
 *
 * Accepts wizard-based configuration (parse_config + column_mapping) for price list imports
 *
 * @see TEM-306 - Update Import Route to Accept Wizard Config
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { uploadPriceListWorkflow } from "../../../../../../modules/purchasing/workflows/upload-price-list"
import { z } from "zod"

const parseConfigSchema = z.object({
  format_type: z.enum(['csv', 'fixed-width']),
  delimiter: z.string().length(1).optional(),
  quote_char: z.string().length(1).optional(),
  has_header: z.boolean().optional(),
  skip_rows: z.number().min(0).optional(),
  fixed_width_columns: z.array(z.object({
    name: z.string(),
    start: z.number().min(0),
    width: z.number().min(1),
  })).optional(),
})

const columnMappingSchema = z.record(z.string(), z.string()).refine(
  (mapping) => {
    const values = Object.values(mapping).filter(v => v) // Filter out empty strings

    // Must have net_price
    if (!values.includes('net_price')) {
      return false
    }

    // Must have at least one identifier
    return values.includes('variant_sku') ||
           values.includes('product_id')
  },
  {
    message: "Column mapping must include 'net_price' and at least one identifier (variant_sku or product_id)",
  }
)

const importPriceListSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  effective_date: z.string().optional(),
  expiry_date: z.string().optional(),
  currency_code: z.string().default("USD"),
  brand_id: z.string().optional(),
  file_content: z.string().min(1, "File content is required"),
  file_name: z.string().min(1, "File name is required"),
  parse_config: parseConfigSchema,
  column_mapping: columnMappingSchema,
})

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const supplierId = req.params.id
    
    if (!supplierId) {
      res.status(400).json({
        type: "invalid_data",
        message: "Supplier ID is required",
      })
      return
    }

    const validatedData = importPriceListSchema.parse(req.body)

    // Parse dates if provided
    const effectiveDate = validatedData.effective_date
      ? new Date(validatedData.effective_date)
      : undefined
    const expiryDate = validatedData.expiry_date
      ? new Date(validatedData.expiry_date)
      : undefined

    // Run the workflow with wizard config
    const { result } = await uploadPriceListWorkflow(req.scope).run({
      input: {
        supplier_id: supplierId,
        name: validatedData.name,
        description: validatedData.description,
        effective_date: effectiveDate,
        expiry_date: expiryDate,
        currency_code: validatedData.currency_code,
        brand_id: validatedData.brand_id,
        file_content: validatedData.file_content,
        file_name: validatedData.file_name,
        parse_config: validatedData.parse_config,
        column_mapping: validatedData.column_mapping,
      },
    })

    res.status(200).json({
      price_list: result.price_list,
      import_summary: result.import_summary,
      message: `Price list imported successfully. ${result.import_summary.success_count} items processed, ${result.import_summary.error_count} errors.`,
    })
  } catch (error: any) {
    console.error("Error importing price list:", error)

    if (error.name === "ZodError") {
      res.status(400).json({
        type: "validation_error",
        message: "Invalid request data",
        errors: error.errors,
      })
      return
    }

    // Enhanced error handling for parser-specific errors
    if (error.message?.includes("parser") || error.message?.includes("parse")) {
      res.status(400).json({
        type: "parser_error",
        message: "File format not supported or invalid",
        details: error.message,
      })
      return
    }

    res.status(500).json({
      type: "server_error",
      message: error.message || "Internal server error",
    })
  }
}