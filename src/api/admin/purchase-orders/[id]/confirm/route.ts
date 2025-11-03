import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { confirmPurchaseOrderWorkflow } from "../../../../../modules/purchasing/workflows/confirm-purchase-order"

type PostAdminConfirmPurchaseOrderType = {
  confirmed_by?: string
  notes?: string
}

export const POST = async (
  req: MedusaRequest<PostAdminConfirmPurchaseOrderType>,
  res: MedusaResponse
) => {
  const { id } = req.params
  const { confirmed_by, notes } = req.validatedBody || {}

  const { result } = await confirmPurchaseOrderWorkflow(req.scope).run({
    input: {
      purchase_order_id: id,
      confirmed_by,
      notes,
    },
  })

  res.json({
    purchase_order: result.purchaseOrder,
  })
}
