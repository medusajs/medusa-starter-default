import { model } from "@medusajs/framework/utils"

export const PurchaseOrderStatus = {
  DRAFT: "draft",
  SENT: "sent", 
  CONFIRMED: "confirmed",
  PARTIALLY_RECEIVED: "partially_received",
  RECEIVED: "received",
  CANCELLED: "cancelled",
} as const

export const PurchaseOrderPriority = {
  LOW: "low",
  NORMAL: "normal", 
  HIGH: "high",
  URGENT: "urgent"
} as const

export const PurchaseOrderType = {
  STOCK: "stock",
  RUSH: "rush"
} as const

export const PurchaseOrder = model.define("purchase_order", {
  id: model.id().primaryKey(),
  po_number: model.text().unique().searchable(),
  supplier_id: model.text().searchable(),
  status: model.enum(PurchaseOrderStatus).default(PurchaseOrderStatus.DRAFT),
  priority: model.enum(PurchaseOrderPriority).default(PurchaseOrderPriority.NORMAL),
  type: model.enum(PurchaseOrderType).default(PurchaseOrderType.STOCK),
  order_date: model.dateTime(),
  expected_delivery_date: model.dateTime().nullable(),
  actual_delivery_date: model.dateTime().nullable(),
  currency_code: model.text().default("USD"),
  subtotal: model.bigNumber().default(0),
  tax_amount: model.bigNumber().default(0),
  shipping_amount: model.bigNumber().default(0),
  discount_amount: model.bigNumber().default(0),
  total_amount: model.bigNumber().default(0),
  payment_terms: model.text().nullable(),
  delivery_address: model.json().nullable(),
  billing_address: model.json().nullable(),
  notes: model.text().nullable(),
  internal_notes: model.text().nullable(),
  created_by: model.text().nullable(),
  confirmed_by: model.text().nullable(),
  approved_by: model.text().nullable(),
  metadata: model.json().nullable(),
  items: model.hasMany(() => PurchaseOrderItem, {
    mappedBy: "purchase_order",
  }),
})

export const PurchaseOrderItem = model.define("purchase_order_item", {
  id: model.id().primaryKey(),
  purchase_order: model.belongsTo(() => PurchaseOrder, {
    mappedBy: "items",
  }),
  product_variant_id: model.text(),
  supplier_product_id: model.text().nullable(),
  supplier_sku: model.text().nullable(),
  product_title: model.text(),
  product_variant_title: model.text().nullable(),
  product_sku: model.text().nullable(),
  quantity_ordered: model.number(),
  quantity_received: model.number().default(0),
  unit_cost: model.bigNumber(),
  line_total: model.bigNumber(),
  received_date: model.dateTime().nullable(),
  expected_receipt_date: model.dateTime().nullable(),
  notes: model.text().nullable(),
  metadata: model.json().nullable(),
}) 