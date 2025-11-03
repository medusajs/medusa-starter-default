import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { calculateBackordersStep } from "../steps/calculate-backorders"
import { PURCHASING_MODULE } from ".."
import PurchasingService from "../service"
import { PurchaseOrderStatus, PurchaseOrderType, PurchaseOrderPriority } from "../models/purchase-order.model"

type CreateBackorderPOInput = {
  source_purchase_order_id: string
  notes?: string
  expected_delivery_date?: Date
}

/**
 * Step: Create new purchase order from backorders
 */
const createBackorderPurchaseOrderStep = createStep(
  "create-backorder-purchase-order-step",
  async (
    input: {
      source_purchase_order_id: string
      backorder_items: any[]
      notes?: string
      expected_delivery_date?: Date
    },
    { container }
  ) => {
    const purchasingService = container.resolve(
      PURCHASING_MODULE
    ) as PurchasingService

    // Fetch source PO to get supplier and other details
    const sourcePO = await purchasingService.retrievePurchaseOrder(
      input.source_purchase_order_id
    )

    if (input.backorder_items.length === 0) {
      throw new Error("No backorder items to create purchase order from")
    }

    // Generate new PO number
    const poNumber = await purchasingService.generatePONumber()

    // Prepare items for the new PO
    const newPOItems = input.backorder_items.map((item) => ({
      product_variant_id: item.product_variant_id,
      supplier_sku: item.supplier_sku,
      product_title: item.product_title,
      product_variant_title: item.product_variant_title,
      product_sku: item.product_sku,
      quantity_ordered: item.backorder_quantity,
      unit_cost: item.unit_cost,
    }))

    // Create new purchase order
    const newPO = await purchasingService.createPurchaseOrder({
      supplier_id: sourcePO.supplier_id,
      po_number: poNumber,
      status: PurchaseOrderStatus.DRAFT,
      priority: PurchaseOrderPriority.HIGH, // Backorders are typically high priority
      type: sourcePO.type || PurchaseOrderType.STOCK,
      order_date: new Date(),
      expected_delivery_date: input.expected_delivery_date,
      currency_code: sourcePO.currency_code,
      payment_terms: sourcePO.payment_terms,
      notes: input.notes
        ? `Backorder from PO ${sourcePO.po_number}\n\n${input.notes}`
        : `Backorder from PO ${sourcePO.po_number}`,
      internal_notes: `Auto-created from backorders of ${sourcePO.po_number}`,
      items: newPOItems,
    })

    // Update metadata to link back to source PO
    await purchasingService.updatePurchaseOrders([
      {
        id: newPO.id,
        metadata: {
          ...newPO.metadata,
          source_purchase_order_id: input.source_purchase_order_id,
          source_po_number: sourcePO.po_number,
          is_backorder: true,
        },
      },
    ])

    // Fetch the updated PO with items
    const updatedNewPO = await purchasingService.retrievePurchaseOrder(newPO.id, {
      relations: ["items"],
    })

    return new StepResponse(
      { purchaseOrder: updatedNewPO },
      { newPurchaseOrderId: updatedNewPO.id }
    )
  },
  async (compensationData, { container }) => {
    if (!compensationData?.newPurchaseOrderId) {
      return
    }

    const purchasingService = container.resolve(
      PURCHASING_MODULE
    ) as PurchasingService

    // Delete the newly created purchase order
    await purchasingService.deletePurchaseOrders([compensationData.newPurchaseOrderId])
  }
)

export const createBackorderPOWorkflow = createWorkflow(
  "create-backorder-po-workflow",
  (input: CreateBackorderPOInput) => {
    // Step 1: Calculate backorders from source PO
    const { backorder_items } = calculateBackordersStep({
      purchase_order_id: input.source_purchase_order_id,
    })

    // Step 2: Create new PO from backorders
    const { purchaseOrder } = createBackorderPurchaseOrderStep({
      source_purchase_order_id: input.source_purchase_order_id,
      backorder_items,
      notes: input.notes,
      expected_delivery_date: input.expected_delivery_date,
    })

    return new WorkflowResponse({
      purchaseOrder,
      backorder_items_count: backorder_items.length,
    })
  }
)
