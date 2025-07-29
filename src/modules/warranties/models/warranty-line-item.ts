import { model } from "@medusajs/framework/utils"

export const WarrantyLineItemType = {
  LABOR: "labor",
  PRODUCT: "product", 
  SHIPPING: "shipping",
  ADJUSTMENT: "adjustment",
} as const

const WarrantyLineItem = model.define("warranty_line_item", {
  id: model.id().primaryKey(),
  
  // Line Item Details
  item_type: model.enum(WarrantyLineItemType).default(WarrantyLineItemType.LABOR),
  title: model.text(), // Display title
  description: model.text().nullable(), // Additional description
  sku: model.text().nullable(), // Product SKU if applicable
  
  // Quantities and Pricing
  quantity: model.number().default(1),
  unit_price: model.number().default(0), // Unit price in EUR
  total_amount: model.number().default(0), // Total line amount
  
  // Product Information (if applicable)
  product_id: model.text().nullable(), // Links to Product module
  variant_id: model.text().nullable(), // Links to ProductVariant
  
  // Service Order References
  service_order_id: model.text().nullable(), // Original service order
  service_order_item_id: model.text().nullable(), // Reference to service order item
  service_order_time_entry_id: model.text().nullable(), // Reference to time entry
  
  // Labor-specific fields
  hours_worked: model.number().nullable(), // For labor items
  hourly_rate: model.number().nullable(), // For labor items
  
  // Financial
  tax_rate: model.number().default(0.21), // Belgium VAT rate
  tax_amount: model.number().default(0),
  
  // Reimbursement tracking
  is_reimbursable: model.boolean().default(true),
  reimbursement_amount: model.number().default(0), // Amount reimbursed for this item
  reimbursement_reference: model.text().nullable(), // External reimbursement reference
  
  // Metadata
  metadata: model.json().nullable(),

  // Relationships
  warranty: model.belongsTo(() => require("./warranty").default, {
    mappedBy: "line_items",
  }),
})
.indexes([
  {
    name: "IDX_warranty_line_item_warranty_id",
    on: ["warranty_id"],
    unique: false,
  },
  {
    name: "IDX_warranty_line_item_product_id",
    on: ["product_id"],
    unique: false,
    where: "product_id IS NOT NULL",
  },
  {
    name: "IDX_warranty_line_item_variant_id",
    on: ["variant_id"], 
    unique: false,
    where: "variant_id IS NOT NULL",
  },
  {
    name: "IDX_warranty_line_item_service_order_id",
    on: ["service_order_id"],
    unique: false,
    where: "service_order_id IS NOT NULL",
  },
  {
    name: "IDX_warranty_line_item_type",
    on: ["item_type"],
    unique: false,
  },
])

export default WarrantyLineItem 