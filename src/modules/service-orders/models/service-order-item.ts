import { model } from "@medusajs/framework/utils"

export const ServiceOrderItemStatus = {
  PENDING: "pending",
  ORDERED: "ordered", 
  RECEIVED: "received",
  USED: "used",
  RETURNED: "returned",
} as const

const ServiceOrderItem = model.define("service_order_item", {
  id: model.id().primaryKey(),
  service_order_id: model.text(),
  
  // Product reference (will be linked via module links)
  product_id: model.text().nullable(),
  variant_id: model.text().nullable(),
  
  // Item details (cached for performance)
  title: model.text(),
  description: model.text().nullable(),
  sku: model.text().nullable(),
  
  // Quantities
  quantity_needed: model.number(),
  quantity_used: model.number().default(0),
  quantity_returned: model.number().default(0),
  
  // Pricing
  unit_price: model.number(),
  total_price: model.number(),
  
  // Status
  status: model.enum(ServiceOrderItemStatus).default(ServiceOrderItemStatus.PENDING),
  
  // Additional info
  is_warranty_covered: model.boolean().default(false),
  supplier_order_number: model.text().nullable(),
  notes: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default ServiceOrderItem 