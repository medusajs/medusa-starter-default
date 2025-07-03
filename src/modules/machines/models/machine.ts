import { model } from "@medusajs/framework/utils"

const Machine = model.define("machine", {
  id: model.id().primaryKey(),
  brand: model.text(),
  model: model.text(),
  serial_number: model.text().unique(),
  year: model.text(),
  engine_hours: model.text().nullable(),
  fuel_type: model.text(),
  horsepower: model.text().nullable(),
  weight: model.text().nullable(),
  purchase_date: model.text().nullable(),
  purchase_price: model.text().nullable(),
  current_value: model.text().nullable(),
  status: model.text().default("active"),
  location: model.text().nullable(),
  notes: model.text().nullable(),
  customer_id: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default Machine 