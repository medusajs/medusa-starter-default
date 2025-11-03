import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createBackorderPOWorkflow } from "../../../../../modules/purchasing/workflows/create-backorder-po"

type PostAdminCreateBackorderPOType = {
  notes?: string
  expected_delivery_date?: string
}

export const POST = async (
  req: MedusaRequest<PostAdminCreateBackorderPOType>,
  res: MedusaResponse
) => {
  const { id } = req.params
  const { notes, expected_delivery_date } = req.validatedBody || {}

  const { result } = await createBackorderPOWorkflow(req.scope).run({
    input: {
      source_purchase_order_id: id,
      notes,
      expected_delivery_date: expected_delivery_date
        ? new Date(expected_delivery_date)
        : undefined,
    },
  })

  res.json({
    purchase_order: result.purchaseOrder,
    backorder_items_count: result.backorder_items_count,
  })
}
