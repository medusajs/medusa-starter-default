import { createStep, StepResponse } from "@medusajs/workflows-sdk"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
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
    product_title?: string
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
    
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { items, ...orderData } = input
    
    // Enrich items with product titles if missing
    const enrichedItems: Array<typeof items[0] & { product_title: string }> = []
    
    for (const item of items) {
      let productTitle = item.product_title
      let variantTitle = item.product_variant_title
      
      if (!productTitle || !variantTitle) {
        try {
          const { data: [variantData] } = await query.graph({
            entity: "product_variant",
            fields: ["id", "title", "product.title"],
            filters: { id: item.product_variant_id }
          })
          
          if (variantData) {
            productTitle = productTitle || variantData.product?.title || `Product for variant ${item.product_variant_id}`
            variantTitle = variantTitle || variantData.title || ""
          }
        } catch (error) {
          console.warn(`Failed to fetch product title for variant ${item.product_variant_id}:`, error)
          productTitle = productTitle || `Product for variant ${item.product_variant_id}`
          variantTitle = variantTitle || ""
        }
      }
      
      enrichedItems.push({
        ...item,
        product_title: productTitle,
        product_variant_title: variantTitle
      })
    }
    
    // Generate PO number
    const currentDate = new Date()
    const year = currentDate.getFullYear()
    const existingPOs = await purchasingService.listPurchaseOrders({
      po_number: { $like: `PO-${year}-%` }
    })
    const poNumber = `PO-${year}-${String(existingPOs.length + 1).padStart(3, '0')}`
    
    // Calculate totals
    const subtotal = enrichedItems.reduce((sum, item) => sum + (item.quantity_ordered * item.unit_cost), 0)
    
    const [purchaseOrder] = await purchasingService.createPurchaseOrders([{
      ...orderData,
      po_number: poNumber,
      order_date: currentDate,
      status: PurchaseOrderStatus.DRAFT,
      subtotal,
      total_amount: subtotal, // For now, no tax or shipping
    }])

    const itemsToCreate = enrichedItems.map((item) => ({
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