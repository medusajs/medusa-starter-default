import { model } from "@medusajs/framework/utils"

const SupplierPriceList = model.define("supplier_price_list", {
  id: model.id().primaryKey(),
  supplier_id: model.text(),
  name: model.text().searchable(),
  description: model.text().nullable(),
  effective_date: model.dateTime().nullable(),
  expiry_date: model.dateTime().nullable(),
  is_active: model.boolean().default(true),
  version: model.number().default(1),
  currency_code: model.text().default("USD"),
  upload_filename: model.text().nullable(),
  upload_metadata: model.json().nullable(),
  metadata: model.json().nullable(),
})
.cascades({
  delete: ["supplier_price_list_items"]
})
.indexes([
  {
    name: "supplier_active_price_list_idx",
    on: ["supplier_id", "is_active"],
    unique: true,
    where: "is_active = true"
  }
])

export default SupplierPriceList