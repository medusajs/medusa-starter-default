import { model } from "@medusajs/framework/utils"

/**
 * TEM-202: Rental Status History model
 *
 * Tracks all status changes for rentals, providing an audit trail
 * of status transitions with reasons and timestamps.
 */

const RentalStatusHistory = model.define("rental_status_history", {
  id: model.id().primaryKey(),
  rental_id: model.text(), // Foreign key to rental

  // Status transition tracking
  from_status: model.text().nullable(), // null for initial creation
  to_status: model.text(),

  // Audit fields
  changed_by: model.text(),
  changed_at: model.dateTime(),
  reason: model.text().nullable(),
})
.indexes([
  {
    on: ["rental_id"],
  },
  {
    on: ["changed_at"],
  },
])

export default RentalStatusHistory