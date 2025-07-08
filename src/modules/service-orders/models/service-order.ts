import { model } from "@medusajs/framework/utils"

export const ServiceOrderStatus = {
  DRAFT: "draft",
  SCHEDULED: "scheduled", 
  IN_PROGRESS: "in_progress",
  WAITING_PARTS: "waiting_parts",
  CUSTOMER_APPROVAL: "customer_approval",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const

export const ServiceOrderType = {
  NORMAL: "normal",
  WARRANTY: "warranty", 
  SETUP: "setup", // Setting up sold tractor
  EMERGENCY: "emergency",
  PREVENTIVE: "preventive",
} as const

export const ServiceOrderPriority = {
  LOW: "low",
  NORMAL: "normal", 
  HIGH: "high",
  URGENT: "urgent",
} as const

const ServiceOrder = model.define("service_order", {
  id: model.id().primaryKey(),
  service_order_number: model.text().unique(), // Auto-generated: SO-2024-001
  
  // Links to other modules - these will be used for module links
  customer_id: model.text().nullable(), // Links to Customer module
  machine_id: model.text().nullable(), // Links to Machine module
  technician_id: model.text().nullable(), // Links to Technician module
  
  // Service Details
  service_type: model.enum(ServiceOrderType).default(ServiceOrderType.NORMAL),
  status: model.enum(ServiceOrderStatus).default(ServiceOrderStatus.DRAFT),
  priority: model.enum(ServiceOrderPriority).default(ServiceOrderPriority.NORMAL),
  
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
  
  // Additional Info
  requires_parts_approval: model.boolean().default(false),
  customer_approval_required: model.boolean().default(false),
  internal_notes: model.text().nullable(),
  customer_notes: model.text().nullable(),
  
  // System fields
  created_by: model.text().nullable(),
  updated_by: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default ServiceOrder 