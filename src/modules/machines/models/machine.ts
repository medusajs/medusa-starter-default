import { model } from "@medusajs/framework/utils"

const Machine = model
  .define("machine", {
    id: model.id({ prefix: "machine" }).primaryKey(),
    
    // Basic Information
    model: model.text().searchable(),
    serial_number: model.text().searchable(),
    year: model.number().nullable(),
    
    // Technical Specifications  
    engine_hours: model.number().nullable(),
    fuel_type: model.text().nullable(),
    horsepower: model.number().nullable(),
    weight: model.number().nullable(), // in kg or lbs
    
    // Financial Information
    purchase_date: model.dateTime().nullable(),
    purchase_price: model.bigNumber().nullable(),
    current_value: model.bigNumber().nullable(),
    
    // Status and Location
    status: model.enum(["active", "inactive", "maintenance", "sold"]).default("active"),
    location: model.text().searchable().nullable(),
    
    // Customer Assignment
    customer_id: model.text().nullable(),
    
    // Additional Information
    notes: model.text().searchable().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      name: "IDX_machine_serial_number_unique",
      on: ["serial_number"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_machine_customer_id",
      on: ["customer_id"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_machine_status",
      on: ["status"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_machine_model",
      on: ["model"],
      unique: false,
      where: "deleted_at IS NULL",
    },
  ])

export default Machine 