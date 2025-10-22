import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PURCHASING_MODULE } from "../../../../../modules/purchasing"
import PurchasingModuleService from "../../../../../modules/purchasing/service"
import { validatePurchaseOrderSendable } from "../../../../../modules/purchasing/steps/validate-purchase-order-sendable"

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  const purchasingService: PurchasingModuleService = req.scope.resolve(PURCHASING_MODULE)

  // Fetch the purchase order with items
  const purchaseOrders = await purchasingService.listPurchaseOrders(
    { id: [id] },
    { relations: ["items"] }
  )

  const purchaseOrder = purchaseOrders[0]
  if (!purchaseOrder) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Purchase order with id ${id} not found`
    )
  }

  // Validate that the PO can be sent
  await validatePurchaseOrderSendable.invoke(
    { purchase_order: purchaseOrder },
    { container: req.scope }
  )

  // Update status to 'sent'
  const [updatedPO] = await purchasingService.updatePurchaseOrders([
    {
      id: purchaseOrder.id,
      status: "sent",
    },
  ])

  res.json({
    purchase_order: updatedPO,
  })
}
