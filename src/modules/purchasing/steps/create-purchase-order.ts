import { createStep, StepResponse } from "@medusajs/workflows-sdk"
import { PURCHASING_MODULE } from ".."
import PurchasingService from "../services/purchasing.service"

type CreatePurchaseOrderStepInput = {
  supplier_id: string
  items: {
    product_variant_id: string
    quantity: number
    unit_price: number
  }[]
}

export const createPurchaseOrderStep = createStep(
  "create-purchase-order-step",
  async (input: CreatePurchaseOrderStepInput, { container }) => {
    const purchasingService = container.resolve(
      PURCHASING_MODULE
    ) as PurchasingService

    const { items, ...orderData } = input
    const [purchaseOrder] = await purchasingService.createPurchaseOrders([
      orderData,
    ])

    const itemsToCreate = items.map((item) => ({
      ...item,
      purchase_order_id: purchaseOrder.id,
    }))

    await purchasingService.createPurchaseOrderItems(itemsToCreate)

    return new StepResponse({ purchaseOrder }, { purchaseOrderId: purchaseOrder.id })
  },
  async (compensationInput, { container }) => {
    if (!compensationInput?.purchaseOrderId) {
      return
    }

    const purchasingService = container.resolve(
      PURCHASING_MODULE
    ) as PurchasingService
    
    await purchasingService.deletePurchaseOrders([compensationInput.purchaseOrderId])
  }
) 