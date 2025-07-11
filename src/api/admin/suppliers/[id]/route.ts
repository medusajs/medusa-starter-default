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
export const POST = async (
  req: MedusaRequest<PutAdminUpdateSupplierType>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  const { id } = req.params
  const updateData = req.validatedBody

  const [supplier] = await purchasingService.updateSuppliers([{
    id,
    ...updateData,
  }])

  res.json({ supplier })
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