import { model } from "@medusajs/framework/utils"

const Machine = model
  .define("machine", {
    id: model.id({ prefix: "machine" }).primaryKey(),
    
    // Basic Information
    brand_id: model.text().nullable(), // Reference to brands module
    model_number: model.text().searchable(), // More descriptive than just "model"
    serial_number: model.text().searchable(),
    license_plate: model.text().searchable().nullable(),
    year: model.number().nullable(),
    machine_type: model.text().searchable().nullable(), // New field for machine type
    
    // Technical Specifications  
    engine_hours: model.number().nullable(),
    
    // Status and Location
    status: model.enum(["active", "inactive", "maintenance", "sold"]).default("active"),
    
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
      name: "IDX_machine_brand_id",
      on: ["brand_id"],
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
    {
      name: "IDX_machine_machine_type",
      on: ["machine_type"],
      unique: false,
      where: "deleted_at IS NULL",
    },
  ])

export default Machine 