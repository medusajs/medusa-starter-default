import { model } from "@medusajs/framework/utils"

export const InvoiceLineItemType = {
  PRODUCT: "product",
  SERVICE: "service", 
  LABOR: "labor",
  SHIPPING: "shipping",
  DISCOUNT: "discount",
} as const

const InvoiceLineItem = model.define("invoice_line_item", {
  id: model.id().primaryKey(),
  invoice_id: model.text(),
  
  // Item Type and Source
  item_type: model.enum(InvoiceLineItemType).default(InvoiceLineItemType.PRODUCT),
  
  // Product reference (for product line items)
  product_id: model.text().nullable(),
  variant_id: model.text().nullable(),
  
  // Service order reference (for service line items)
  service_order_item_id: model.text().nullable(),
  service_order_time_entry_id: model.text().nullable(),
  
  // Item details (cached for performance and historical accuracy)
  title: model.text(),
  description: model.text().nullable(),
  sku: model.text().nullable(),
  
  // Quantities and Pricing (stored in cents for precision)
  quantity: model.bigNumber(),
  unit_price: model.bigNumber(),
  total_price: model.bigNumber(),
  
  // Discounts and Taxes
  discount_amount: model.bigNumber().default(0),
  tax_rate: model.bigNumber().default(0), // Tax rate as decimal (e.g., 0.21 for 21%)
  tax_amount: model.bigNumber().default(0),
  
  // Service-specific fields
  hours_worked: model.bigNumber().nullable(), // For labor items
  hourly_rate: model.bigNumber().nullable(), // For labor items
  
  // Additional information
  notes: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default InvoiceLineItem 