import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { receivePurchaseOrderWorkflow } from "../../../../../modules/purchasing/workflows/receive-purchase-order"

type PostAdminReceivePurchaseOrderType = {
  items: {
    purchase_order_item_id: string
    quantity_received: number
    received_date?: Date
    notes?: string
  }[]
}

// POST /admin/purchase-orders/:id/receive - Receive purchase order items
export const POST = async (
  req: MedusaRequest<PostAdminReceivePurchaseOrderType>,
  res: MedusaResponse
) => {
  const { id } = req.params
  const { items } = req.validatedBody

  const { result } = await receivePurchaseOrderWorkflow(req.scope)
    .run({
      input: {
        purchase_order_id: id,
        items,
      },
    })

  res.json({ purchase_order: result })
} 