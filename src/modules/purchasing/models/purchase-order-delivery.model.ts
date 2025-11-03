import { model } from "@medusajs/framework/utils"

export const PurchaseOrderDelivery = model.define("purchase_order_delivery", {
  id: model.id().primaryKey(),
  purchase_order_id: model.text().searchable(),
  delivery_number: model.text().searchable().nullable(),
  delivery_date: model.dateTime(),
  received_by: model.text().nullable(),
  notes: model.text().nullable(),
  import_filename: model.text().nullable(),
  metadata: model.json().nullable(),
  items: model.hasMany(() => PurchaseOrderDeliveryItem, {
    mappedBy: "delivery",
  }),
})

export const PurchaseOrderDeliveryItem = model.define("purchase_order_delivery_item", {
  id: model.id().primaryKey(),
  delivery: model.belongsTo(() => PurchaseOrderDelivery, {
    mappedBy: "items",
  }),
  purchase_order_item_id: model.text(),
  quantity_delivered: model.number(),
  notes: model.text().nullable(),
  metadata: model.json().nullable(),
})
