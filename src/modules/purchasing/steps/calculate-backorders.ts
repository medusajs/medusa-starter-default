import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PURCHASING_MODULE } from ".."
import PurchasingService from "../service"

type CalculateBackordersInput = {
  purchase_order_id: string
}

type BackorderItem = {
  purchase_order_item_id: string
  product_variant_id: string
  product_title: string
  product_variant_title?: string
  product_sku?: string
  supplier_sku?: string
  quantity_ordered: number
  quantity_received: number
  backorder_quantity: number
  unit_cost: number
}

export const calculateBackordersStep = createStep(
  "calculate-backorders-step",
  async (input: CalculateBackordersInput, { container }) => {
    const purchasingService = container.resolve(
      PURCHASING_MODULE
    ) as PurchasingService

    const { purchase_order_id } = input

    // Fetch purchase order with items
    const purchaseOrder = await purchasingService.retrievePurchaseOrder(
      purchase_order_id,
      { relations: ["items"] }
    ) as any

    if (!purchaseOrder.items) {
      return new StepResponse({
        backorder_items: [],
        total_backorder_count: 0,
      })
    }

    // Calculate backorders for each item
    const backorderItems: BackorderItem[] = purchaseOrder.items
      .map((item: any) => {
        const backorder_quantity = item.quantity_ordered - item.quantity_received

        if (backorder_quantity <= 0) {
          return null
        }

        return {
          purchase_order_item_id: item.id,
          product_variant_id: item.product_variant_id,
          product_title: item.product_title,
          product_variant_title: item.product_variant_title,
          product_sku: item.product_sku,
          supplier_sku: item.supplier_sku,
          quantity_ordered: item.quantity_ordered,
          quantity_received: item.quantity_received,
          backorder_quantity,
          unit_cost: item.unit_cost,
        }
      })
      .filter((item: any) => item !== null)

    const totalBackorderCount = backorderItems.reduce(
      (sum, item) => sum + item.backorder_quantity,
      0
    )

    return new StepResponse({
      backorder_items: backorderItems,
      total_backorder_count: totalBackorderCount,
    })
  }
)
