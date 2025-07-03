import { model } from "@medusajs/framework/utils"

const StockLocationDetail = model.define("stock_location_detail", {
  id: model.id().primaryKey(),
  stock_location_id: model.text(), // Links to built-in stock location
  location_code: model.text().searchable(), // e.g., "A1-B2-S3-01"
  zone: model.text().nullable(), // e.g., "A1" 
  aisle: model.text().nullable(), // e.g., "B2"
  shelf: model.text().nullable(), // e.g., "S3"
  bin: model.text().nullable(), // e.g., "01"
  location_type: model.enum(["zone", "aisle", "shelf", "bin", "mixed"]).default("mixed"),
  is_active: model.boolean().default(true),
  max_capacity: model.number().nullable(),
  current_usage: model.number().default(0),
  description: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default StockLocationDetail 