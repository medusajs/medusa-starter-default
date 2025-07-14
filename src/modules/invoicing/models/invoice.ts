import { model } from "@medusajs/framework/utils"

export const InvoiceStatus = {
  DRAFT: "draft",
  SENT: "sent", 
  PAID: "paid",
  OVERDUE: "overdue",
  CANCELLED: "cancelled",
} as const

export const InvoiceType = {
  PRODUCT_SALE: "product_sale",
  SERVICE_WORK: "service_work", 
  MIXED: "mixed",
} as const

const Invoice = model.define("invoice", {
  id: model.id().primaryKey(),
  invoice_number: model.text().unique().searchable(), // Auto-generated: INV-2024-001
  
  // Links to other modules - these will be handled via module links
  customer_id: model.text().searchable(), // Links to Customer module
  order_id: model.text().nullable(), // Links to Order module (for regular orders)
  service_order_id: model.text().nullable(), // Links to Service Orders module
  
  // Invoice Details
  invoice_type: model.enum(InvoiceType).default(InvoiceType.PRODUCT_SALE),
  status: model.enum(InvoiceStatus).default(InvoiceStatus.DRAFT),
  
  // Dates
  invoice_date: model.dateTime(),
  due_date: model.dateTime(),
  sent_date: model.dateTime().nullable(),
  paid_date: model.dateTime().nullable(),
  
  // Financial information (stored in cents for precision)
  subtotal: model.bigNumber().default(0),
  tax_amount: model.bigNumber().default(0),
  discount_amount: model.bigNumber().default(0),
  total_amount: model.bigNumber().default(0),
  
  // Currency
  currency_code: model.text().default("EUR"), // Belgium-focused
  
  // Addresses (stored as JSON for flexibility)
  billing_address: model.json(),
  shipping_address: model.json().nullable(),
  
  // References
  customer_email: model.text().searchable(),
  customer_phone: model.text().nullable(),
  
  // Additional Details
  notes: model.text().nullable(),
  internal_notes: model.text().nullable(),
  payment_terms: model.text().nullable(),
  
  // PDF Generation
  pdf_file_id: model.text().nullable(), // Links to File module
  
  // System fields
  created_by: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default Invoice 