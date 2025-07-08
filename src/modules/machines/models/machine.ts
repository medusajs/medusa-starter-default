import { model } from "@medusajs/framework/utils"

const Machine = model
  .define("machine", {
    id: model.id({ prefix: "machine" }).primaryKey(),
    
    // Basic Information
    name: model.text().searchable(), // Changed from model to name for consistency
    model_number: model.text().searchable(), // More descriptive than just "model"
    serial_number: model.text().searchable(),
    year: model.number().nullable(),
    
    // Technical Specifications  
    engine_hours: model.number().nullable(),
    fuel_type: model.text().nullable(),
    horsepower: model.number().nullable(),
    weight: model.number().nullable(), // in kg
    
    // Financial Information
    purchase_date: model.dateTime().nullable(),
    purchase_price: model.bigNumber().nullable(),
    current_value: model.bigNumber().nullable(),
    
    // Status and Location
    status: model.enum(["active", "inactive", "maintenance", "sold"]).default("active"),
    location: model.text().searchable().nullable(),
    
    // Customer Assignment - This will be linked via module links
    // We keep the ID for backward compatibility but relationships are handled via links
    customer_id: model.text().nullable(),
    
    // Additional Information
    description: model.text().searchable().nullable(), // Added description field
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
      name: "IDX_machine_model_number",
      on: ["model_number"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_machine_year",
      on: ["year"],
      unique: false,
      where: "deleted_at IS NULL",
    },
  ])

export default Machine 