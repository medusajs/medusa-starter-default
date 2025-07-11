import { model } from "@medusajs/framework/utils"

export const PurchaseOrderStatus = {
  DRAFT: "draft",
  SENT: "sent", 
  CONFIRMED: "confirmed",
  PARTIALLY_RECEIVED: "partially_received",
  RECEIVED: "received",
  CANCELLED: "cancelled",
} as const

export const PurchaseOrder = model.define("purchase_order", {
  id: model.id().primaryKey(),
  po_number: model.text().unique(), // Auto-generated PO number like "PO-2024-001"
  supplier_id: model.text(),
  status: model.enum(PurchaseOrderStatus).default(PurchaseOrderStatus.DRAFT),
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
  delivery_address: model.json().nullable(), // Store delivery address
  notes: model.text().nullable(),
  created_by: model.text().nullable(), // User who created the PO
  confirmed_by: model.text().nullable(), // User who confirmed the PO
  metadata: model.json().nullable(),
})

export const PurchaseOrderItem = model.define("purchase_order_item", {
  id: model.id().primaryKey(),
  purchase_order_id: model.text(),
  product_variant_id: model.text(),
  supplier_product_id: model.text().nullable(), // Link to supplier-product relationship
  supplier_sku: model.text().nullable(), // Cache supplier SKU for reference
  product_title: model.text(), // Cache product title
  product_variant_title: model.text().nullable(), // Cache variant title  
  quantity_ordered: model.number(),
  quantity_received: model.number().default(0),
  unit_cost: model.bigNumber(),
  line_total: model.bigNumber(),
  received_date: model.dateTime().nullable(),
  notes: model.text().nullable(),
  metadata: model.json().nullable(),
}) 