import { model } from "@medusajs/framework/utils"

const Machine = model.define("machine", {
  id: model.id().primaryKey(),
  brand: model.text(),
  model: model.text(),
  serial_number: model.text().unique(),
  year: model.integer(),
  engine_hours: model.integer().nullable(),
  fuel_type: model.enum(["diesel", "petrol", "electric", "hybrid"]),
  horsepower: model.integer().nullable(),
  weight: model.decimal().nullable(),
  purchase_date: model.date().nullable(),
  purchase_price: model.decimal().nullable(),
  current_value: model.decimal().nullable(),
  status: model.enum(["active", "maintenance", "retired", "sold"]).default("active"),
  location: model.text().nullable(),
  notes: model.text().nullable(),
  customer_id: model.text().nullable(),
  metadata: model.json().nullable(),
  created_at: model.date().default(() => new Date()),
  updated_at: model.date().default(() => new Date()),
})

export default Machine 