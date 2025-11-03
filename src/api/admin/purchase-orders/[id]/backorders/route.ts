import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { calculateBackordersStep } from "../../../../../modules/purchasing/steps/calculate-backorders"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params

  const { output } = await calculateBackordersStep.invoke(
    { purchase_order_id: id },
    { container: req.scope }
  )

  res.json({
    backorder_items: output.backorder_items,
    total_backorder_count: output.total_backorder_count,
  })
}
