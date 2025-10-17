import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PURCHASING_MODULE } from "../../../../modules/purchasing"
import { PurchasingService } from "../../../../modules/purchasing"

type GetAdminSupplierParams = {
  id: string
}

type PutAdminUpdateSupplierType = {
  name?: string
  code?: string
  email?: string
  phone?: string
  website?: string
  contact_person?: string
  address_line_1?: string
  address_line_2?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  tax_id?: string
  payment_terms?: string
  currency_code?: string
  is_active?: boolean
  notes?: string
  metadata?: Record<string, any>
  // Pricing sync configuration
  is_pricing_source?: boolean
  pricing_priority?: number
  auto_sync_prices?: boolean
}

// GET /admin/suppliers/:id - Get supplier by ID
export const GET = async (
  req: MedusaRequest<GetAdminSupplierParams>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  const { id } = req.params

  const supplier = await purchasingService.retrieveSupplier(id)

  res.json({ supplier })
}

// PUT /admin/suppliers/:id - Update supplier
export const PUT = async (
  req: MedusaRequest<PutAdminUpdateSupplierType>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  const { id } = req.params
  const updateData = req.body

  try {
    // Validate pricing_priority if provided
    if (updateData.pricing_priority !== undefined) {
      if (typeof updateData.pricing_priority !== 'number' || updateData.pricing_priority < 0) {
        return res.status(400).json({
          error: "Invalid pricing_priority",
          message: "pricing_priority must be a non-negative number"
        })
      }
    }

    const [supplier] = await purchasingService.updateSuppliers([{
      id,
      ...updateData,
    }])

    res.json({ supplier })
  } catch (error) {
    console.error(`Failed to update supplier ${id}:`, error.message)

    res.status(500).json({
      error: "Failed to update supplier",
      message: error.message || "An unexpected error occurred"
    })
  }
}

// DELETE /admin/suppliers/:id - Delete supplier
export const DELETE = async (
  req: MedusaRequest<GetAdminSupplierParams>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  const { id } = req.params

  await purchasingService.deleteSuppliers([id])

  res.json({ 
    id,
    object: "supplier",
    deleted: true 
  })
} 