import { model } from "@medusajs/framework/utils"

export const RentalOrderStatus = {
  DRAFT: "draft",
  CONFIRMED: "confirmed", 
  ACTIVE: "active",
  RETURNED: "returned",
  OVERDUE: "overdue",
  CANCELLED: "cancelled",
} as const

export const RentalOrderType = {
  SHORT_TERM: "short_term", // Daily/weekly rentals
  LONG_TERM: "long_term",   // Monthly/yearly rentals
  TRIAL: "trial",           // Trial period before purchase
} as const

const RentalOrder = model.define("rental_order", {
  id: model.id({ prefix: "rental" }).primaryKey(),
  rental_order_number: model.text().unique(), // Auto-generated: RO-2024-001
  
  // Links to other modules
  customer_id: model.text(), // Links to Customer module
  machine_id: model.text(),  // Links to Machine module
  
  // Rental Details  
  rental_type: model.enum(RentalOrderType).default(RentalOrderType.SHORT_TERM),
  status: model.enum(RentalOrderStatus).default(RentalOrderStatus.DRAFT),
  
  // Dates and Duration
  start_date: model.dateTime(),
  end_date: model.dateTime(),
  actual_return_date: model.dateTime().nullable(),
  
  // Financial
  daily_rate: model.number(),
  weekly_rate: model.number().nullable(),
  monthly_rate: model.number().nullable(),
  security_deposit: model.number().default(0),
  total_rental_cost: model.number().default(0),
  additional_charges: model.number().default(0), // Late fees, damage, etc.
  
  // Delivery Information
  delivery_required: model.boolean().default(false),
  delivery_address_line_1: model.text().nullable(),
  delivery_address_line_2: model.text().nullable(),
  delivery_city: model.text().nullable(),
  delivery_postal_code: model.text().nullable(),
  delivery_country: model.text().nullable(),
  delivery_cost: model.number().default(0),
  
  pickup_required: model.boolean().default(false),
  pickup_address_line_1: model.text().nullable(),
  pickup_address_line_2: model.text().nullable(),
  pickup_city: model.text().nullable(),
  pickup_postal_code: model.text().nullable(),
  pickup_country: model.text().nullable(),
  pickup_cost: model.number().default(0),
  
  // Machine Condition
  condition_on_delivery: model.text().nullable(),
  condition_on_return: model.text().nullable(),
  damage_notes: model.text().nullable(),
  
  // Rental Terms
  terms_and_conditions: model.text().nullable(),
  special_instructions: model.text().nullable(),
  insurance_required: model.boolean().default(false),
  insurance_cost: model.number().default(0),
  
  // Billing
  billing_cycle: model.enum(["daily", "weekly", "monthly"]).default("daily"),
  payment_terms: model.text().nullable(),
  late_fee_percentage: model.number().default(0),
  
  // Additional Info
  notes: model.text().nullable(),
  internal_notes: model.text().nullable(),
  
  // System fields
  created_by: model.text().nullable(),
  updated_by: model.text().nullable(),
  metadata: model.json().nullable(),
})
.indexes([
  {
    name: "IDX_rental_order_customer_id",
    on: ["customer_id"],
    where: "deleted_at IS NULL",
  },
  {
    name: "IDX_rental_order_machine_id", 
    on: ["machine_id"],
    where: "deleted_at IS NULL",
  },
  {
    name: "IDX_rental_order_status",
    on: ["status"],
    where: "deleted_at IS NULL",
  },
  {
    name: "IDX_rental_order_dates",
    on: ["start_date", "end_date"],
    where: "deleted_at IS NULL",
  },
])

export default RentalOrder