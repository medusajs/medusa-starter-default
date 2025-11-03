import {
  createWorkflow,
  WorkflowResponse,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { parseDeliveryNoteStep } from "../steps/parse-delivery-note"
import { calculateBackordersStep } from "../steps/calculate-backorders"
import { updateInventoryStep } from "../steps/update-inventory"
import { PURCHASING_MODULE } from ".."
import PurchasingService from "../service"
import { PurchaseOrderStatus } from "../models/purchase-order.model"

type ImportDeliveryNoteInput = {
  purchase_order_id: string
  file_content: string
  delivery_number?: string
  delivery_date?: Date
  received_by?: string
  notes?: string
  import_filename?: string
}

/**
 * Step: Create delivery record
 */
const createDeliveryRecordStep = createStep(
  "create-delivery-record-step",
  async (
    input: {
      purchase_order_id: string
      delivery_number?: string
      delivery_date?: Date
      received_by?: string
      notes?: string
      import_filename?: string
      matched_items: any[]
    },
    { container }
  ) => {
    const purchasingService = container.resolve(
      PURCHASING_MODULE
    ) as PurchasingService

    // Create delivery record
    const [delivery] = await purchasingService.createPurchaseOrderDeliveries([
      {
        purchase_order_id: input.purchase_order_id,
        delivery_number: input.delivery_number,
        delivery_date: input.delivery_date || new Date(),
        received_by: input.received_by,
        notes: input.notes,
        import_filename: input.import_filename,
      },
    ])

    // Create delivery items
    const deliveryItems = input.matched_items.map((item) => ({
      delivery_id: delivery.id,
      purchase_order_item_id: item.purchase_order_item_id,
      quantity_delivered: item.quantity_delivered,
      notes: item.notes,
    }))

    await purchasingService.createPurchaseOrderDeliveryItems(deliveryItems)

    return new StepResponse(
      { delivery },
      { deliveryId: delivery.id }
    )
  },
  async (compensationData, { container }) => {
    if (!compensationData?.deliveryId) {
      return
    }

    const purchasingService = container.resolve(
      PURCHASING_MODULE
    ) as PurchasingService

    // Delete delivery and its items (cascading delete should handle items)
    await purchasingService.deletePurchaseOrderDeliveries([compensationData.deliveryId])
  }
)

/**
 * Step: Update PO item quantities
 */
const updatePOItemQuantitiesStep = createStep(
  "update-po-item-quantities-step",
  async (
    input: {
      matched_items: Array<{
        purchase_order_item_id: string
        quantity_delivered: number
      }>
    },
    { container }
  ) => {
    const purchasingService = container.resolve(
      PURCHASING_MODULE
    ) as PurchasingService

    // Track previous quantities for rollback
    const previousQuantities: Record<string, number> = {}

    for (const item of input.matched_items) {
      const poItem = await purchasingService.retrievePurchaseOrderItem(
        item.purchase_order_item_id
      )
      previousQuantities[item.purchase_order_item_id] = poItem.quantity_received

      // Update quantity_received
      await purchasingService.updatePurchaseOrderItems([
        {
          id: item.purchase_order_item_id,
          quantity_received: poItem.quantity_received + item.quantity_delivered,
          received_date: new Date(),
        },
      ])
    }

    return new StepResponse(
      { success: true },
      { previousQuantities }
    )
  },
  async (compensationData, { container }) => {
    if (!compensationData?.previousQuantities) {
      return
    }

    const purchasingService = container.resolve(
      PURCHASING_MODULE
    ) as PurchasingService

    // Revert quantities
    for (const [itemId, previousQuantity] of Object.entries(
      compensationData.previousQuantities
    )) {
      await purchasingService.updatePurchaseOrderItems([
        {
          id: itemId,
          quantity_received: previousQuantity,
        },
      ])
    }
  }
)

/**
 * Step: Update PO status based on received quantities
 */
const updatePOStatusStep = createStep(
  "update-po-status-step",
  async (
    input: {
      purchase_order_id: string
    },
    { container }
  ) => {
    const purchasingService = container.resolve(
      PURCHASING_MODULE
    ) as PurchasingService

    const purchaseOrder = await purchasingService.retrievePurchaseOrder(
      input.purchase_order_id,
      { relations: ["items"] }
    ) as any

    const previousStatus = purchaseOrder.status

    const allItems = purchaseOrder.items || []
    const allFullyReceived = allItems.every(
      (item: any) => item.quantity_received >= item.quantity_ordered
    )
    const someReceived = allItems.some((item: any) => item.quantity_received > 0)

    let newStatus = purchaseOrder.status
    if (allFullyReceived) {
      newStatus = PurchaseOrderStatus.RECEIVED
    } else if (someReceived) {
      newStatus = PurchaseOrderStatus.PARTIALLY_RECEIVED
    }

    if (newStatus !== purchaseOrder.status) {
      await purchasingService.updatePurchaseOrders([
        {
          id: input.purchase_order_id,
          status: newStatus,
          actual_delivery_date: allFullyReceived ? new Date() : undefined,
        },
      ])
    }

    return new StepResponse(
      { newStatus },
      {
        purchaseOrderId: input.purchase_order_id,
        previousStatus,
      }
    )
  },
  async (compensationData, { container }) => {
    if (!compensationData?.purchaseOrderId) {
      return
    }

    const purchasingService = container.resolve(
      PURCHASING_MODULE
    ) as PurchasingService

    // Revert status
    await purchasingService.updatePurchaseOrders([
      {
        id: compensationData.purchaseOrderId,
        status: compensationData.previousStatus,
        actual_delivery_date: undefined,
      },
    ])
  }
)

export const importDeliveryNoteWorkflow = createWorkflow(
  "import-delivery-note-workflow",
  (input: ImportDeliveryNoteInput) => {
    // Step 1: Parse delivery note CSV
    const { matched_items, unmatched_items } = parseDeliveryNoteStep({
      purchase_order_id: input.purchase_order_id,
      file_content: input.file_content,
      delivery_number: input.delivery_number,
    })

    // Step 2: Create delivery record
    const { delivery } = createDeliveryRecordStep({
      purchase_order_id: input.purchase_order_id,
      delivery_number: input.delivery_number,
      delivery_date: input.delivery_date,
      received_by: input.received_by,
      notes: input.notes,
      import_filename: input.import_filename,
      matched_items,
    })

    // Step 3: Update PO item quantities
    updatePOItemQuantitiesStep({ matched_items })

    // Step 4: Update inventory
    const { inventoryUpdates } = updateInventoryStep({
      purchase_order_id: input.purchase_order_id,
      items: transform({ matched_items }, (data) =>
        data.matched_items.map((item: any) => ({
          purchase_order_item_id: item.purchase_order_item_id,
          quantity_received: item.quantity_delivered,
        }))
      ),
    })

    // Step 5: Update PO status
    const { newStatus } = updatePOStatusStep({
      purchase_order_id: input.purchase_order_id,
    })

    // Step 6: Calculate backorders
    const { backorder_items, total_backorder_count } = calculateBackordersStep({
      purchase_order_id: input.purchase_order_id,
    })

    return new WorkflowResponse({
      delivery,
      matched_items,
      unmatched_items,
      backorder_items,
      total_backorder_count,
      new_status: newStatus,
      inventoryUpdates,
    })
  }
)
