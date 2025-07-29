import { model } from "@medusajs/framework/utils"

const RentalItem = model.define("rental_item", {
  id: model.id({ prefix: "rental_item" }).primaryKey(),
  
  // Links
  rental_order_id: model.text(),
  machine_id: model.text().nullable(), // For machine rentals
  product_variant_id: model.text().nullable(), // For accessory/tool rentals
  
  // Item Details
  item_type: model.enum(["machine", "accessory", "tool", "other"]).default("machine"),
  item_name: model.text(),
  item_description: model.text().nullable(),
  
  // Quantity and Rates
  quantity: model.number().default(1),
  daily_rate: model.number(),
  weekly_rate: model.number().nullable(),
  monthly_rate: model.number().nullable(),
  
  // Calculated Costs
  total_days: model.number().default(0),
  line_total: model.number().default(0),
  
  // Condition Tracking
  condition_on_delivery: model.text().nullable(),
  condition_on_return: model.text().nullable(),
  damage_assessment: model.text().nullable(),
  damage_cost: model.number().default(0),
  
  // Additional Info
  serial_numbers: model.text().nullable(), // For tracking specific items
  notes: model.text().nullable(),
  metadata: model.json().nullable(),
})
.indexes([
  {
    name: "IDX_rental_item_rental_order_id",
    on: ["rental_order_id"],
    where: "deleted_at IS NULL",
  },
  {
    name: "IDX_rental_item_machine_id",
    on: ["machine_id"],
    where: "deleted_at IS NULL",
  },
])

export default RentalItem