import { model } from "@medusajs/utils"

export const PurchaseOrder = model.define("purchase_order", {
  id: model.id().primaryKey(),
  supplier_id: model.id(),
  status: model.text().default("draft"),
})

export const PurchaseOrderItem = model.define("purchase_order_item", {
  id: model.id().primaryKey(),
  purchase_order_id: model.id(),
  product_variant_id: model.id(),
  quantity: model.number(),
  unit_price: model.bigNumber(),
}) 