import { model } from "@medusajs/framework/utils"
import { WarrantyStatus } from "./warranty"

const WarrantyStatusHistory = model.define("warranty_status_history", {
  id: model.id().primaryKey(),
  
  // Status Change Details
  from_status: model.enum(WarrantyStatus).nullable(), // Previous status (null for first entry)
  to_status: model.enum(WarrantyStatus), // New status
  
  // Change Information
  changed_by: model.text().nullable(), // User who made the change
  change_reason: model.text().nullable(), // Reason for status change
  notes: model.text().nullable(), // Additional notes about the change
  
  // External References (for approvals, rejections, etc.)
  external_reference: model.text().nullable(), // External system reference
  approval_number: model.text().nullable(), // Approval reference from warranty provider
  
  // Metadata
  metadata: model.json().nullable(),

  // Relationships
  warranty: model.belongsTo(() => require("./warranty").default, {
    mappedBy: "status_history",
  }),
})
.indexes([
  {
    name: "IDX_warranty_status_history_warranty_id",
    on: ["warranty_id"],
    unique: false,
  },
  {
    name: "IDX_warranty_status_history_to_status",
    on: ["to_status"],
    unique: false,
  },
  {
    name: "IDX_warranty_status_history_created_at",
    on: ["created_at"],
    unique: false,
  },
])

export default WarrantyStatusHistory 