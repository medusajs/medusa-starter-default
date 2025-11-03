import { model } from "@medusajs/framework/utils"

/**
 * TEM-202: Rental data model for hour-based machine rentals
 *
 * This model tracks machine rentals based on machine hours usage,
 * calculating costs from the difference between start and end hours.
 */

export const RentalStatus = {
  DRAFT: "draft",
  ACTIVE: "active",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const

export const RentalType = {
  HOURLY: "hourly",
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
} as const

const Rental = model.define("rental", {
  id: model.id().primaryKey(),
  rental_number: model.text().unique(), // Auto-generated: RNT-2025-001

  // Links to other modules - for module links
  customer_id: model.text().nullable(),
  machine_id: model.text().nullable(),

  // Rental status and type
  status: model.enum(RentalStatus).default(RentalStatus.DRAFT),
  rental_type: model.enum(RentalType).default(RentalType.HOURLY),

  // Machine Hours - core feature for hour-based billing
  start_machine_hours: model.number().nullable(),
  end_machine_hours: model.number().nullable(),
  total_hours_used: model.number().default(0), // Calculated field

  // Pricing - TEM-205: All monetary values stored in cents for precision
  hourly_rate: model.number(), // Primary rate in cents
  daily_rate: model.number().nullable(), // Optional daily rate in cents
  total_rental_cost: model.number().default(0), // Calculated based on hours in cents

  // Dates
  rental_start_date: model.dateTime(),
  rental_end_date: model.dateTime().nullable(),
  expected_return_date: model.dateTime(),
  actual_return_date: model.dateTime().nullable(),

  // Additional Info
  description: model.text().nullable(),
  pickup_notes: model.text().nullable(),
  return_notes: model.text().nullable(),
  internal_notes: model.text().nullable(),
  deposit_amount: model.number().nullable(),
  deposit_paid: model.boolean().default(false),

  // System fields
  created_by: model.text().nullable(),
  updated_by: model.text().nullable(),
  metadata: model.json().nullable(),
})
.indexes([
  {
    on: ["customer_id"],
    where: "customer_id IS NOT NULL"
  },
  {
    on: ["machine_id"],
    where: "machine_id IS NOT NULL"
  },
  {
    on: ["status"],
  },
  {
    on: ["rental_start_date"],
  },
])

export default Rental
