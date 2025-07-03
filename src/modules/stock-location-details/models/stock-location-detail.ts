import { model } from "@medusajs/framework/utils"

const StockLocationDetail = model.define("stock_location_detail", {
  id: model.id().primaryKey(),
  stock_location_id: model.text(),
  location_code: model.text(),
  zone: model.text().nullable(),
  aisle: model.text().nullable(),
  shelf: model.text().nullable(),
  bin: model.text().nullable(),
  is_active: model.boolean().default(true),
  metadata: model.json().nullable(),
})

export default StockLocationDetail 