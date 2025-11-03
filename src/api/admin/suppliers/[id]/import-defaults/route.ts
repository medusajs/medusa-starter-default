/**
 * Supplier Import Defaults API Routes
 *
 * GET  /admin/suppliers/:id/import-defaults - Get supplier import defaults
 * POST /admin/suppliers/:id/import-defaults - Update supplier import defaults
 *
 * Import defaults are stored in supplier.metadata.import_defaults
 * and include pricing_mode, parsing_method, template_id, and delimiter.
 *
 * These defaults pre-populate the import wizard for faster repeat imports.
 */

import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PURCHASING_MODULE } from "../../../../../modules/purchasing"
import { PurchasingService } from "../../../../../modules/purchasing"
import { ImportDefaults, PricingMode, ParsingMethod } from "../../../../../modules/purchasing/types/discount-types"

type GetAdminSupplierImportDefaultsParams = {
  id: string
}

type PostAdminSupplierImportDefaultsType = {
  pricing_mode: PricingMode
  parsing_method: ParsingMethod
  template_id?: string
  delimiter?: string
}

/**
 * Validates import defaults configuration
 */
function validateImportDefaults(importDefaults: PostAdminSupplierImportDefaultsType): void {
  // Validate pricing_mode
  const validPricingModes: PricingMode[] = ["net_only", "calculated", "percentage", "code_mapping"]
  if (!validPricingModes.includes(importDefaults.pricing_mode)) {
    throw new Error(`Invalid pricing_mode: ${importDefaults.pricing_mode}`)
  }

  // Validate parsing_method
  const validParsingMethods: ParsingMethod[] = ["template", "delimited", "fixed-width"]
  if (!validParsingMethods.includes(importDefaults.parsing_method)) {
    throw new Error(`Invalid parsing_method: ${importDefaults.parsing_method}`)
  }

  // Validate template_id if parsing_method is template
  if (importDefaults.parsing_method === "template" && !importDefaults.template_id) {
    throw new Error("template_id is required when parsing_method is 'template'")
  }

  // Validate delimiter if parsing_method is delimited
  if (importDefaults.parsing_method === "delimited" && !importDefaults.delimiter) {
    throw new Error("delimiter is required when parsing_method is 'delimited'")
  }
}

/**
 * GET /admin/suppliers/:id/import-defaults
 * Retrieve supplier import defaults configuration
 *
 * Returns the configured import defaults, or derives pricing_mode from
 * discount_structure if import_defaults is not set.
 */
export const GET = async (
  req: MedusaRequest<GetAdminSupplierImportDefaultsParams>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  const { id } = req.params

  try {
    const supplier = await purchasingService.retrieveSupplier(id, {
      select: ["id", "name", "metadata"]
    })

    // Get configured import defaults
    const importDefaults = supplier.metadata?.import_defaults

    // If import_defaults exists, return it
    if (importDefaults) {
      res.json({
        import_defaults: importDefaults,
        supplier_name: supplier.name
      })
      return
    }

    // Otherwise, derive pricing_mode from discount_structure
    const discountStructure = supplier.metadata?.discount_structure
    const derivedPricingMode: PricingMode = discountStructure?.type || "net_only"

    // Return derived defaults
    res.json({
      import_defaults: {
        pricing_mode: derivedPricingMode,
        parsing_method: "delimited" as ParsingMethod,
        delimiter: ","
      },
      supplier_name: supplier.name,
      is_derived: true  // Indicates these are derived, not configured
    })
  } catch (error: any) {
    console.error(`Failed to retrieve import defaults for supplier ${id}:`, error.message)
    res.status(500).json({
      error: "Failed to retrieve import defaults",
      message: error.message || "An unexpected error occurred",
    })
  }
}

/**
 * POST /admin/suppliers/:id/import-defaults
 * Update supplier import defaults configuration
 *
 * Stores the import defaults in supplier.metadata.import_defaults
 */
export const POST = async (
  req: MedusaRequest<PostAdminSupplierImportDefaultsType>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  const { id } = req.params
  const importDefaults = req.body

  try {
    // Validate import defaults
    validateImportDefaults(importDefaults)

    // Retrieve current supplier
    const supplier = await purchasingService.retrieveSupplier(id)

    // Update supplier metadata with import defaults
    const [updatedSupplier] = await purchasingService.updateSuppliers([
      {
        id,
        metadata: {
          ...supplier.metadata,
          import_defaults: importDefaults,
        },
      },
    ])

    res.json({
      success: true,
      import_defaults: updatedSupplier.metadata?.import_defaults,
    })
  } catch (error: any) {
    console.error(`Failed to update import defaults for supplier ${id}:`, error.message)
    res.status(400).json({
      error: error.message || "Failed to update import defaults",
    })
  }
}
