import { createStep, StepResponse } from "@medusajs/workflows-sdk"
import { PURCHASING_MODULE } from ".."
import PurchasingService from "../service"
import { PurchaseOrderStatus } from "../models/purchase-order.model"

type ReceivePurchaseOrderStepInput = {
  purchase_order_id: string
  items: {
    purchase_order_item_id: string
    quantity_received: number
    received_date?: Date
    notes?: string
  }[]
}

export const receivePurchaseOrderStep = createStep(
  "receive-purchase-order-step",
  async (input: ReceivePurchaseOrderStepInput, { container }) => {
    const purchasingService = container.resolve(
      PURCHASING_MODULE
    ) as PurchasingService

    const { purchase_order_id, items } = input

    // Update purchase order items
    for (const item of items) {
      await purchasingService.updatePurchaseOrderItems([{
        id: item.purchase_order_item_id,
        quantity_received: (await purchasingService.retrievePurchaseOrderItem(item.purchase_order_item_id)).quantity_received + item.quantity_received,
        received_date: item.received_date || new Date(),
        notes: item.notes,
      }])
    }

    // Check if all items are fully received
    const purchaseOrder = await purchasingService.retrievePurchaseOrder(purchase_order_id, {
      relations: ["items"]
    }) as any // Type assertion for now since relations aren't properly typed yet
    
    const allItems = purchaseOrder.items || []
    const allFullyReceived = allItems.every(item => item.quantity_received >= item.quantity_ordered)
    const someReceived = allItems.some(item => item.quantity_received > 0)
    
    let newStatus = purchaseOrder.status
    if (allFullyReceived) {
      newStatus = PurchaseOrderStatus.RECEIVED
    } else if (someReceived) {
      newStatus = PurchaseOrderStatus.PARTIALLY_RECEIVED
    }

    // Update purchase order status if needed
    if (newStatus !== purchaseOrder.status) {
      await purchasingService.updatePurchaseOrders([{
        id: purchase_order_id,
        status: newStatus,
        actual_delivery_date: allFullyReceived ? new Date() : undefined,
      }])
    }

    const updatedPurchaseOrder = await purchasingService.retrievePurchaseOrder(purchase_order_id)

    return new StepResponse({ purchaseOrder: updatedPurchaseOrder }, { 
      purchaseOrderId: purchase_order_id,
      itemUpdates: items
    })
  },
  async (compensationInput, { container }) => {
    if (!compensationInput?.purchaseOrderId || !compensationInput?.itemUpdates) {
      return
    }

    const purchasingService = container.resolve(
      PURCHASING_MODULE
    ) as PurchasingService
    
    // Revert the quantity_received for each item
    for (const item of compensationInput.itemUpdates) {
      const currentItem = await purchasingService.retrievePurchaseOrderItem(item.purchase_order_item_id)
      await purchasingService.updatePurchaseOrderItems([{
        id: item.purchase_order_item_id,
        quantity_received: Math.max(0, currentItem.quantity_received - item.quantity_received),
      }])
    }

    // Revert purchase order status if needed
    const purchaseOrder = await purchasingService.retrievePurchaseOrder(compensationInput.purchaseOrderId)
    await purchasingService.updatePurchaseOrders([{
      id: compensationInput.purchaseOrderId,
      status: PurchaseOrderStatus.CONFIRMED, // Revert to confirmed
      actual_delivery_date: null,
    }])
  }
) 