import { createStep, StepResponse } from "@medusajs/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PURCHASING_MODULE } from ".."
import PurchasingService from "../service"
import { PurchaseOrderType } from "../models/purchase-order.model"

type AddItemToDraftPurchaseOrderStepInput = {
  supplier_id: string
  type?: "stock" | "rush"
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

    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { supplier_id, item, type } = input

    // Determine the type for this item (default to STOCK if not provided)
    const orderType = type || PurchaseOrderType.STOCK

    // 1. Find an existing draft purchase order for the supplier with matching type
    // This ensures that stock and rush orders are kept separate
    let [purchaseOrder] = await purchasingService.listPurchaseOrders({
      supplier_id: supplier_id,
      status: "draft",
      type: orderType,
    })

    // 2. If no draft exists for this supplier and type combination, create one
    if (!purchaseOrder) {
      const po_number = await purchasingService.generatePONumber()
      ;[purchaseOrder] = await purchasingService.createPurchaseOrders([
        {
          supplier_id: supplier_id,
          status: "draft",
          type: orderType,
          po_number: po_number,
          order_date: new Date(),
        },
      ])
    }

    // 3. Fetch product and variant details
    let productTitle = `Product for variant ${item.product_variant_id}`
    let variantTitle = ""
    let productSku = null

    try {
      const { data: [variantData] } = await query.graph({
        entity: "product_variant",
        fields: ["id", "title", "sku", "product.title"],
        filters: { id: item.product_variant_id }
      })

      if (variantData) {
        productTitle = variantData.product?.title || productTitle
        variantTitle = variantData.title || ""
        productSku = variantData.sku || null
      }
    } catch (error) {
      console.warn(`Failed to fetch product details for variant ${item.product_variant_id}:`, error)
    }

    // 4. Add the item to the purchase order
    const itemToCreate = {
      product_variant_id: item.product_variant_id,
      quantity_ordered: item.quantity,
      unit_cost: item.unit_price,
      line_total: item.quantity * item.unit_price,
      product_title: productTitle,
      product_variant_title: variantTitle,
      product_sku: productSku,
      purchase_order_id: purchaseOrder.id,
    }
    const [createdItem] = await purchasingService.createPurchaseOrderItems([
      itemToCreate,
    ])

    return new StepResponse({ createdItem })
  }
) 