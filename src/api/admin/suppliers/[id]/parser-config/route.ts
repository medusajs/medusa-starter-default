/**
 * Parser Configuration Management Routes
 *
 * Endpoints for managing supplier-specific price list parser configurations
 *
 * @see TEM-160 - Create Parser Config API Routes
 * @see TEM-162 - Create Parser Config Management Routes
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PURCHASING_MODULE } from "../../../../../modules/purchasing"
import { PurchasingService } from "../../../../../modules/purchasing"
import type { ParserConfig } from "../../../../../modules/purchasing/types/parser-types"
import { z } from "zod"

// Validation schemas
const parserConfigSchema = z.object({
  type: z.enum(["csv", "fixed-width"]),
  template_name: z.string().optional(),
  config: z.any(), // CsvConfig or FixedWidthConfig
})

type GetParserConfigParams = {
  id: string
}

/**
 * GET /admin/suppliers/:id/parser-config
 *
 * Retrieves the current parser configuration for a supplier along with
 * available parser templates.
 */
export const GET = async (
  req: MedusaRequest<GetParserConfigParams>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  const { id: supplierId } = req.params

  try {
    // Get current parser config from supplier metadata
    const config = await purchasingService.getSupplierParserConfig(supplierId)

    // Get available parser templates
    const templates = await purchasingService.listParserTemplates()

    res.status(200).json({
      parser_config: config,
      available_templates: templates,
    })
  } catch (error: any) {
    console.error(`Error fetching parser config for supplier ${supplierId}:`, error)

    res.status(500).json({
      type: "server_error",
      message: error.message || "Failed to fetch parser configuration",
    })
  }
}

/**
 * PUT /admin/suppliers/:id/parser-config
 *
 * Updates the parser configuration for a supplier. Validates the configuration
 * before saving to supplier metadata.
 */
export const PUT = async (
  req: MedusaRequest<GetParserConfigParams>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  const { id: supplierId } = req.params

  try {
    // Validate request body
    const validatedData = parserConfigSchema.parse(req.body) as ParserConfig

    // Validate parser configuration
    const validation = await purchasingService.validateParserConfig(validatedData)

    if (!validation.valid) {
      res.status(400).json({
        type: "validation_error",
        message: "Invalid parser configuration",
        errors: validation.errors,
      })
      return
    }

    // Update supplier parser config
    await purchasingService.updateSupplierParserConfig(supplierId, validatedData)

    res.status(200).json({
      message: "Parser configuration updated successfully",
      parser_config: validatedData,
    })
  } catch (error: any) {
    console.error(`Error updating parser config for supplier ${supplierId}:`, error)

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
      message: error.message || "Failed to update parser configuration",
    })
  }
}
