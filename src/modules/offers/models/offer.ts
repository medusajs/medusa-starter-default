import { model } from "@medusajs/framework/utils"
import OfferLineItem from "./offer-line-item"
import OfferStatusHistory from "./offer-status-history"

export const OfferStatus = {
  DRAFT: "draft",
  SENT: "sent",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  EXPIRED: "expired",
  CONVERTED: "converted", // Converted to order
} as const

const Offer = model.define("offer", {
  id: model.id().primaryKey(),
  offer_number: model.text().unique().searchable(), // Auto-generated: OFF-2024-001

  // Customer Information
  customer_id: model.text().searchable(), // Links to Customer module
  customer_email: model.text().searchable(),
  customer_phone: model.text().nullable(),

  // Offer Details
  status: model.enum(OfferStatus).default(OfferStatus.DRAFT),

  // Dates
  offer_date: model.dateTime(),
  valid_until: model.dateTime(), // Expiration date
  sent_date: model.dateTime().nullable(),
  accepted_date: model.dateTime().nullable(),
  rejected_date: model.dateTime().nullable(),
  converted_date: model.dateTime().nullable(),

  // Financial Information (stored in cents)
  subtotal: model.bigNumber().default(0),
  tax_amount: model.bigNumber().default(0),
  discount_amount: model.bigNumber().default(0),
  total_amount: model.bigNumber().default(0),

  // Currency
  currency_code: model.text().default("EUR"),

  // Addresses (stored as JSON)
  billing_address: model.json(),
  shipping_address: model.json().nullable(),

  // Additional Details
  notes: model.text().nullable(),
  internal_notes: model.text().nullable(),
  terms_and_conditions: model.text().nullable(),

  // PDF Generation
  pdf_file_id: model.text().nullable(),

  // Conversion tracking
  converted_order_id: model.text().nullable(),

  // System fields
  created_by: model.text().nullable(),
  metadata: model.json().nullable(),

  // Relationships
  line_items: model.hasMany(() => OfferLineItem, {
    mappedBy: "offer",
  }),
  status_history: model.hasMany(() => OfferStatusHistory, {
    mappedBy: "offer",
  }),
})

export default Offer
