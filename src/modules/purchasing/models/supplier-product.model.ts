import { model } from "@medusajs/framework/utils"

const SupplierProduct = model.define("supplier_product", {
  id: model.id().primaryKey(),
  supplier_id: model.text(),
  product_variant_id: model.text(),
  supplier_sku: model.text().nullable(), // Supplier's internal SKU
  supplier_product_name: model.text().nullable(), // How supplier calls this product
  supplier_product_description: model.text().nullable(),
  cost_price: model.bigNumber(), // Cost price from supplier
  currency_code: model.text().default("USD"),
  minimum_order_quantity: model.number().default(1),
  lead_time_days: model.number().nullable(), // How many days to deliver
  is_preferred_supplier: model.boolean().default(false), // Is this the preferred supplier for this product
  is_active: model.boolean().default(true),
  last_cost_update: model.dateTime().nullable(),
  notes: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default SupplierProduct 