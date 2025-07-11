import { createStep, StepResponse } from "@medusajs/workflows-sdk"
import { PURCHASING_MODULE } from ".."
import PurchasingService from "../services/purchasing.service"

type AddItemToDraftPurchaseOrderStepInput = {
  supplier_id: string
  item: {
    product_variant_id: string
    quantity: number
    unit_price: number
  }
}

export const addItemToDraftPurchaseOrderStep = createStep(
  "add-item-to-draft-purchase-order-step",
  async (input: AddItemToDraftPurchaseOrderStepInput, { container }) => {
    const purchasingService = container.resolve(
      PURCHASING_MODULE
    ) as PurchasingService

    const { supplier_id, item } = input

    // 1. Find an existing draft purchase order for the supplier
    let [purchaseOrder] = await purchasingService.listPurchaseOrders({
      supplier_id: supplier_id,
      status: "draft",
    })

    // 2. If no draft exists, create one
    if (!purchaseOrder) {
      ;[purchaseOrder] = await purchasingService.createPurchaseOrders([
        { supplier_id: supplier_id, status: "draft" },
      ])
    }

    // 3. Add the item to the purchase order
    const itemToCreate = {
      ...item,
      purchase_order_id: purchaseOrder.id,
    }
    const [createdItem] = await purchasingService.createPurchaseOrderItems([
      itemToCreate,
    ])

    return new StepResponse({ createdItem })
  }
) 