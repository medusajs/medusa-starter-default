import { model } from "@medusajs/framework/utils"

export const WarrantyStatus = {
  DRAFT: "draft",
  SUBMITTED: "submitted", 
  APPROVED: "approved",
  REIMBURSED: "reimbursed",
  REJECTED: "rejected",
  CLOSED: "closed",
} as const

export const WarrantyType = {
  MANUFACTURER: "manufacturer",
  SUPPLIER: "supplier", 
  EXTENDED: "extended",
  GOODWILL: "goodwill",
} as const

const Warranty = model.define("warranty", {
  id: model.id().primaryKey(),
  warranty_number: model.text().unique(), // Auto-generated: WAR-2024-001
  
  // Links to other modules - these will be used for module links
  service_order_id: model.text(), // Links to Service Order module (required)
  customer_id: model.text().nullable(), // Links to Customer module
  machine_id: model.text().nullable(), // Links to Machine module
  
  // Warranty Details
  warranty_type: model.enum(WarrantyType).default(WarrantyType.MANUFACTURER),
  status: model.enum(WarrantyStatus).default(WarrantyStatus.DRAFT),
  
  // Claim Information
  warranty_claim_number: model.text().nullable(), // External claim reference
  warranty_provider: model.text().nullable(), // Manufacturer/Supplier name
  claim_reference: model.text().nullable(), // External reference number
  
  // Financial Tracking
  labor_cost: model.number().default(0), // Total labor cost
  parts_cost: model.number().default(0), // Total parts cost
  total_cost: model.number().default(0), // Total warranty cost
  reimbursement_amount: model.number().default(0), // Amount reimbursed
  currency_code: model.text().default("EUR"), // Belgium default
  
  // Dates
  warranty_start_date: model.dateTime().nullable(), // When warranty coverage started
  warranty_end_date: model.dateTime().nullable(), // When warranty coverage ends
  claim_date: model.dateTime().nullable(), // When claim was submitted
  approval_date: model.dateTime().nullable(), // When claim was approved
  reimbursement_date: model.dateTime().nullable(), // When reimbursement was received
  
  // Addresses (copied from service order or customer)
  billing_address_line_1: model.text().nullable(),
  billing_address_line_2: model.text().nullable(),
  billing_city: model.text().nullable(),
  billing_postal_code: model.text().nullable(),
  billing_country: model.text().default("BE"), // Belgium default
  
  service_address_line_1: model.text().nullable(),
  service_address_line_2: model.text().nullable(),
  service_city: model.text().nullable(),
  service_postal_code: model.text().nullable(),
  service_country: model.text().default("BE"),
  
  // Description and Notes
  description: model.text().nullable(), // Work description
  failure_description: model.text().nullable(), // What failed
  repair_description: model.text().nullable(), // What was repaired
  notes: model.text().nullable(), // Additional notes
  internal_notes: model.text().nullable(), // Internal tracking notes
  
  // Metadata
  metadata: model.json().nullable(),
  created_by: model.text().nullable(),
  updated_by: model.text().nullable(),

  // Relationships
  line_items: model.hasMany(() => require("./warranty-line-item").default, {
    mappedBy: "warranty",
  }),
  status_history: model.hasMany(() => require("./warranty-status-history").default, {
    mappedBy: "warranty",
  }),
})
.indexes([
  {
    name: "IDX_warranty_warranty_number",
    on: ["warranty_number"],
    unique: true,
    where: "deleted_at IS NULL",
  },
  {
    name: "IDX_warranty_service_order_id",
    on: ["service_order_id"],
    unique: false,
    where: "deleted_at IS NULL",
  },
  {
    name: "IDX_warranty_customer_id", 
    on: ["customer_id"],
    unique: false,
    where: "deleted_at IS NULL",
  },
  {
    name: "IDX_warranty_machine_id",
    on: ["machine_id"],
    unique: false,
    where: "deleted_at IS NULL",
  },
  {
    name: "IDX_warranty_status",
    on: ["status"],
    unique: false,
  },
  {
    name: "IDX_warranty_warranty_type",
    on: ["warranty_type"], 
    unique: false,
  },
  {
    name: "IDX_warranty_claim_date",
    on: ["claim_date"],
    unique: false,
  },
])

export default Warranty 