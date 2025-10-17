/**
 * Price List Import Route
 *
 * Supports flexible file format import (CSV, fixed-width) with dynamic parser selection
 *
 * @see TEM-161 - Update Import Route to use new workflow
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { uploadPriceListWorkflow } from "../../../../../../modules/purchasing/workflows/upload-price-list"
import { z } from "zod"

const importPriceListSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  effective_date: z.string().optional(),
  expiry_date: z.string().optional(),
  currency_code: z.string().default("USD"),
  brand_id: z.string().optional(),
  file_content: z.string().min(1, "File content is required"),
  file_name: z.string().min(1, "File name is required"),
  upload_filename: z.string().optional(), // Optional for backward compatibility
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

    // Run the flexible upload workflow
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
        upload_filename: validatedData.upload_filename || validatedData.file_name,
      },
    })

    res.status(200).json({
      price_list: result.price_list,
      import_summary: result.import_summary,
      parser_config: result.parser_config,
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