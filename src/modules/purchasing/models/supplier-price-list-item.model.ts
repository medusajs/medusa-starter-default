import { model } from "@medusajs/framework/utils"

const SupplierPriceListItem = model.define("supplier_price_list_item", {
  id: model.id().primaryKey(),
  price_list_id: model.text(),
  product_variant_id: model.text(),
  product_id: model.text(),
  supplier_sku: model.text().nullable(),
  variant_sku: model.text().nullable(),
  // Pricing fields
  gross_price: model.bigNumber().nullable(),
  discount_code: model.text().nullable(), // Original supplier discount code (e.g., 'A', 'B')
  discount_percentage: model.number().nullable(),
  // Note: discount_amount removed - redundant field (can be calculated from gross_price and discount_percentage)
  net_price: model.bigNumber(),

  // Product information
  quantity: model.number().default(1),
  description: model.text().nullable(), // Product description from supplier
  category: model.text().nullable(), // Supplier's product category
  lead_time_days: model.number().nullable(),
  notes: model.text().nullable(),
  metadata: model.json().nullable(),
  // Sync tracking fields for variant pricing sync workflow
  last_synced_at: model.dateTime().nullable(),
  sync_status: model.text().nullable(), // 'pending' | 'synced' | 'error' | 'skipped'
  sync_error: model.text().nullable(),
})

export default SupplierPriceListItem