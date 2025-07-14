import { model } from "@medusajs/framework/utils"

const InvoiceStatusHistory = model.define("invoice_status_history", {
  id: model.id().primaryKey(),
  invoice_id: model.text(),
  
  // Status Change Details
  from_status: model.text().nullable(),
  to_status: model.text(),
  
  // Change Metadata
  changed_by: model.text(),
  changed_at: model.dateTime(),
  reason: model.text().nullable(),
  notes: model.text().nullable(),
  
  // Additional context
  metadata: model.json().nullable(),
})

export default InvoiceStatusHistory 