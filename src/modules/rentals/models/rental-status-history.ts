import { model } from "@medusajs/framework/utils"

const RentalStatusHistory = model.define("rental_status_history", {
  id: model.id({ prefix: "rental_history" }).primaryKey(),
  
  // Links
  rental_order_id: model.text(),
  
  // Status Change Details
  from_status: model.text().nullable(),
  to_status: model.text(),
  change_reason: model.text().nullable(),
  notes: model.text().nullable(),
  
  // User Information
  changed_by: model.text().nullable(),
  change_timestamp: model.dateTime().default("now"),
  
  // Additional tracking
  metadata: model.json().nullable(),
})
.indexes([
  {
    name: "IDX_rental_status_history_rental_order_id",
    on: ["rental_order_id"],
    where: "deleted_at IS NULL",
  },
  {
    name: "IDX_rental_status_history_timestamp",
    on: ["change_timestamp"],
    where: "deleted_at IS NULL",
  },
])

export default RentalStatusHistory