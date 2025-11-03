import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PURCHASING_MODULE } from "../../../../../modules/purchasing"
import PurchasingModuleService from "../../../../../modules/purchasing/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const purchasingService: PurchasingModuleService = req.scope.resolve(PURCHASING_MODULE)

  // Fetch all deliveries for this purchase order
  const deliveries = await purchasingService.listPurchaseOrderDeliveries(
    { purchase_order_id: id },
    { relations: ["items"], order: { delivery_date: "DESC" } }
  )

  res.json({
    deliveries,
  })
}
