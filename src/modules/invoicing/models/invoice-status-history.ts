import { model } from "@medusajs/framework/utils"
import Invoice from "./invoice"

const InvoiceStatusHistory = model.define("invoice_status_history", {
  id: model.id().primaryKey(),
  
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

  // Relationships
  invoice: model.belongsTo(() => Invoice, {
    mappedBy: "status_history",
  }),
})

export default InvoiceStatusHistory 