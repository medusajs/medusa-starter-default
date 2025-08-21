import { model } from "@medusajs/framework/utils"

export const WorkCategory = {
  DIAGNOSIS: "diagnosis",
  REPAIR: "repair",
  TESTING: "testing", 
  DOCUMENTATION: "documentation",
  TRAVEL: "travel",
} as const

const ServiceOrderTimeEntry = model.define("service_order_time_entry", {
  id: model.id().primaryKey(),
  service_order_id: model.text(),
  technician_id: model.text().nullable(), // Will be linked via module links
  
  // Time tracking
  start_time: model.dateTime(),
  end_time: model.dateTime().nullable(),
  duration_minutes: model.number().default(0),
  
  // Work details
  work_description: model.text(),
  work_category: model.enum(WorkCategory).default(WorkCategory.REPAIR),
  
  // Billing
  billable_hours: model.number().default(0),
  hourly_rate: model.number(),
  total_cost: model.number().default(0),
  is_billable: model.boolean().default(true),
  
  // Status
  is_active: model.boolean().default(false), // For real-time timer tracking
  is_approved: model.boolean().default(false),
  approved_by: model.text().nullable(),
  approved_at: model.dateTime().nullable(),
  
  notes: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default ServiceOrderTimeEntry 