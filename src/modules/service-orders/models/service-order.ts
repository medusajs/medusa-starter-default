import { model } from "@medusajs/framework/utils"

export const ServiceOrderStatus = {
  DRAFT: "draft", // In backlog - not visible on kanban board
  READY_FOR_PICKUP: "ready_for_pickup", // Ready to start - shows on kanban board
  IN_PROGRESS: "in_progress", // Currently being worked on
  DONE: "done", // Work completed
  RETURNED_FOR_REVIEW: "returned_for_review", // Denied by invoicing department
} as const

export const ServiceOrderType = {
  INSURANCE: "insurance",
  WARRANTY: "warranty", 
  INTERNAL: "internal",
  STANDARD: "standard",
  SALES_PREP: "sales_prep",
  QUOTE: "quote",
} as const

export const ServiceOrderPriority = {
  LOW: "low",
  NORMAL: "normal", 
  HIGH: "high",
  URGENT: "urgent",
} as const

export const ServiceOrderLocation = {
  WORKSHOP: "workshop",
  CUSTOMER_LOCATION: "customer_location",
} as const

const ServiceOrder = model.define("service_order", {
  id: model.id().primaryKey(),
  service_order_number: model.text().unique(), // Auto-generated: SO-2024-001
  
  // Links to other modules - these will be used for module links
  customer_id: model.text().nullable(), // Links to Customer module
  machine_id: model.text().nullable(), // Links to Machine module
  technician_id: model.text().nullable(), // Links to Technician module
  
  // Service Details
  service_type: model.enum(ServiceOrderType).default(ServiceOrderType.STANDARD),
  status: model.enum(ServiceOrderStatus).default(ServiceOrderStatus.DRAFT),
  priority: model.enum(ServiceOrderPriority).default(ServiceOrderPriority.NORMAL),
  service_location: model.enum(ServiceOrderLocation).default(ServiceOrderLocation.WORKSHOP),
  
  // Descriptions
  description: model.text(), // What needs to be done
  customer_complaint: model.text().nullable(), // Customer's description
  diagnosis: model.text().nullable(), // Technician's findings
  work_performed: model.text().nullable(), // What was actually done
  
  // Scheduling
  scheduled_start_date: model.dateTime().nullable(),
  scheduled_end_date: model.dateTime().nullable(),
  actual_start_date: model.dateTime().nullable(),
  actual_end_date: model.dateTime().nullable(),
  
  // Financial
  estimated_hours: model.number().nullable(),
  actual_hours: model.number().default(0),
  labor_rate: model.number().nullable(), // Per hour rate
  total_labor_cost: model.number().default(0),
  total_parts_cost: model.number().default(0),
  total_cost: model.number().default(0),
  
  // Warranty
  warranty_claim_number: model.text().nullable(),
  warranty_approved: model.boolean().default(false),
  
  // Service Location Details (for customer_location services)
  service_address_line_1: model.text().nullable(),
  service_address_line_2: model.text().nullable(),
  service_city: model.text().nullable(),
  service_postal_code: model.text().nullable(),
  service_country: model.text().nullable(),
  
  // Additional Info
  requires_parts_approval: model.boolean().default(false),
  customer_approval_required: model.boolean().default(false),
  internal_notes: model.text().nullable(),
  customer_notes: model.text().nullable(),
  
  // Service Characteristics
  has_appointment: model.boolean().default(false),
  needs_replacement_vehicle: model.boolean().default(false),
  includes_minor_maintenance: model.boolean().default(false),
  includes_major_maintenance: model.boolean().default(false),
  is_repeated_repair: model.boolean().default(false),
  includes_cleaning: model.boolean().default(false),
  est_used: model.boolean().default(false),
  ca_used: model.boolean().default(false),
  
  // System fields
  created_by: model.text().nullable(),
  updated_by: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default ServiceOrder 