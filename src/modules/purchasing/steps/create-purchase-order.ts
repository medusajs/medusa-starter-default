import { createStep, StepResponse } from "@medusajs/workflows-sdk"
import { PURCHASING_MODULE } from ".."
import PurchasingService from "../service"
import { PurchaseOrderStatus } from "../models/purchase-order.model"

type CreatePurchaseOrderStepInput = {
  supplier_id: string
  expected_delivery_date?: Date
  payment_terms?: string
  delivery_address?: any
  notes?: string
  items: {
    product_variant_id: string
    supplier_product_id?: string
    supplier_sku?: string
    product_title: string
    product_variant_title?: string
    quantity_ordered: number
    unit_cost: number
  }[]
}

export const createPurchaseOrderStep = createStep(
  "create-purchase-order-step",
  async (input: CreatePurchaseOrderStepInput, { container }) => {
    const purchasingService = container.resolve(
      PURCHASING_MODULE
    ) as PurchasingService

    const { items, ...orderData } = input
    
    // Generate PO number
    const currentDate = new Date()
    const year = currentDate.getFullYear()
    const existingPOs = await purchasingService.listPurchaseOrders({
      po_number: { $like: `PO-${year}-%` }
    })
    const poNumber = `PO-${year}-${String(existingPOs.length + 1).padStart(3, '0')}`
    
    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.quantity_ordered * item.unit_cost), 0)
    
    const [purchaseOrder] = await purchasingService.createPurchaseOrders([{
      ...orderData,
      po_number: poNumber,
      order_date: currentDate,
      status: PurchaseOrderStatus.DRAFT,
      subtotal,
      total_amount: subtotal, // For now, no tax or shipping
    }])

    const itemsToCreate = items.map((item) => ({
      ...item,
      purchase_order_id: purchaseOrder.id,
      line_total: item.quantity_ordered * item.unit_cost,
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