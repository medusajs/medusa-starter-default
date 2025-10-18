import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PURCHASING_MODULE } from "../../../../../modules/purchasing"
import { PurchasingService } from "../../../../../modules/purchasing"

type GetAdminSupplierDiscountStructureParams = {
  id: string
}

type DiscountStructureType = "code_mapping" | "percentage" | "calculated" | "net_only"

type PostAdminSupplierDiscountStructureType = {
  type: DiscountStructureType
  mappings?: Record<string, number>
  default_percentage?: number
}

/**
 * Validates discount structure configuration
 */
function validateDiscountStructure(discountStructure: PostAdminSupplierDiscountStructureType): void {
  if (!discountStructure.type) {
    throw new Error("Discount structure type is required")
  }

  const validTypes: DiscountStructureType[] = ["code_mapping", "percentage", "calculated", "net_only"]
  if (!validTypes.includes(discountStructure.type)) {
    throw new Error(`Invalid discount structure type: ${discountStructure.type}`)
  }

  // Validate code_mapping
  if (discountStructure.type === "code_mapping") {
    if (!discountStructure.mappings || Object.keys(discountStructure.mappings).length === 0) {
      throw new Error("Discount code mappings are required for code_mapping type")
    }

    // Validate each mapping
    for (const [code, percentage] of Object.entries(discountStructure.mappings)) {
      if (typeof percentage !== "number" || percentage < 0 || percentage > 100) {
        throw new Error(`Invalid percentage for code '${code}': must be between 0 and 100`)
      }
    }
  }

  // Validate percentage type
  if (discountStructure.type === "percentage") {
    if (discountStructure.default_percentage === undefined || discountStructure.default_percentage === null) {
      throw new Error("Default percentage is required for percentage type")
    }

    if (typeof discountStructure.default_percentage !== "number" ||
        discountStructure.default_percentage < 0 ||
        discountStructure.default_percentage > 100) {
      throw new Error("Default percentage must be between 0 and 100")
    }
  }
}

/**
 * GET /admin/suppliers/:id/discount-structure
 * Retrieve supplier discount structure configuration
 */
export const GET = async (
  req: MedusaRequest<GetAdminSupplierDiscountStructureParams>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  const { id } = req.params

  try {
    const supplier = await purchasingService.retrieveSupplier(id)

    const discountStructure = supplier.metadata?.discount_structure || {
      type: "net_only",
    }

    res.json({ discount_structure: discountStructure })
  } catch (error: any) {
    console.error(`Failed to retrieve discount structure for supplier ${id}:`, error.message)
    res.status(500).json({
      error: "Failed to retrieve discount structure",
      message: error.message || "An unexpected error occurred",
    })
  }
}

/**
 * POST /admin/suppliers/:id/discount-structure
 * Update supplier discount structure configuration
 */
export const POST = async (
  req: MedusaRequest<PostAdminSupplierDiscountStructureType>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  const { id } = req.params
  const discountStructure = req.body

  try {
    // Validate structure
    validateDiscountStructure(discountStructure)

    // Retrieve current supplier
    const supplier = await purchasingService.retrieveSupplier(id)

    // Update supplier metadata with discount structure
    const [updatedSupplier] = await purchasingService.updateSuppliers([
      {
        id,
        metadata: {
          ...supplier.metadata,
          discount_structure: discountStructure,
        },
      },
    ])

    res.json({
      success: true,
      discount_structure: updatedSupplier.metadata?.discount_structure,
    })
  } catch (error: any) {
    console.error(`Failed to update discount structure for supplier ${id}:`, error.message)
    res.status(400).json({
      error: error.message || "Failed to update discount structure",
    })
  }
}
