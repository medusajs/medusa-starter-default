import { model } from "@medusajs/framework/utils"

const SupplierPriceListItem = model.define("supplier_price_list_item", {
  id: model.id().primaryKey(),
  price_list_id: model.text(),
  product_variant_id: model.text(),
  product_id: model.text(),
  supplier_sku: model.text().nullable(),
  variant_sku: model.text().nullable(),
  cost_price: model.bigNumber(),
  quantity: model.number().default(1),
  lead_time_days: model.number().nullable(),
  notes: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default SupplierPriceListItem