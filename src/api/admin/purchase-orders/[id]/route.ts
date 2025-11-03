import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PURCHASING_MODULE } from "../../../../modules/purchasing"
import { PurchasingService } from "../../../../modules/purchasing"

type GetAdminPurchaseOrderParams = {
  id: string
}

type PostAdminUpdatePurchaseOrderType = {
  status?: "draft" | "sent" | "confirmed" | "partially_received" | "received" | "cancelled"
  type?: "stock" | "rush"
  expected_delivery_date?: Date
  payment_terms?: string
  delivery_address?: any
  notes?: string
}

// GET /admin/purchase-orders/:id - Get purchase order by ID
export const GET = async (
  req: MedusaRequest<GetAdminPurchaseOrderParams>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  const { id } = req.params

  const purchase_order = await purchasingService.retrievePurchaseOrder(id, {
    relations: ["items"]
  })

  res.json({ purchase_order })
}

// POST /admin/purchase-orders/:id - Update purchase order
export const POST = async (
  req: MedusaRequest<PostAdminUpdatePurchaseOrderType>,
  res: MedusaResponse
) => {
  const purchasingService = req.scope.resolve(
    PURCHASING_MODULE
  ) as PurchasingService

  const { id } = req.params
  const updateData = req.validatedBody

  const [purchase_order] = await purchasingService.updatePurchaseOrders([{
    id,
    ...updateData,
  }])

  res.json({ purchase_order })
} 