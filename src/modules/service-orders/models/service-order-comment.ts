import { model } from "@medusajs/framework/utils"

export const CommentAuthorType = {
  USER: "user",
  TECHNICIAN: "technician", 
  CUSTOMER: "customer",
  SYSTEM: "system",
} as const

const ServiceOrderComment = model.define("service_order_comment", {
  id: model.id().primaryKey(),
  service_order_id: model.text(),
  
  // Comment Content
  message: model.text(),
  
  // Author Information
  author_id: model.text(),
  author_type: model.enum(CommentAuthorType).default(CommentAuthorType.USER),
  author_name: model.text(), // Cached for performance and historical accuracy
  
  // Threading Support
  parent_comment_id: model.text().nullable(), // For reply threading
  
  // Visibility and Organization
  is_internal: model.boolean().default(false), // Internal comments vs customer-visible
  is_pinned: model.boolean().default(false), // Pin important comments
  
  // Rich Content Support
  attachments: model.json().nullable(), // Array of file attachments
  mentions: model.json().nullable(), // Array of mentioned user IDs
  
  // Editing and Status
  is_edited: model.boolean().default(false),
  edited_at: model.dateTime().nullable(),
  
  // Additional metadata
  metadata: model.json().nullable(),
})

export default ServiceOrderComment 