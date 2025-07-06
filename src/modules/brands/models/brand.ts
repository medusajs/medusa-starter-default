import { model } from "@medusajs/framework/utils"

const Brand = model.define("brand", {
  id: model.id().primaryKey(),
  name: model.text(), // "Caterpillar Inc."
  code: model.text().unique(), // "CAT" - short brand identifier
  logo_url: model.text().nullable(),
  website_url: model.text().nullable(),
  contact_email: model.text().nullable(),
  contact_phone: model.text().nullable(),
  description: model.text().nullable(),
  country_of_origin: model.text().nullable(),
  warranty_terms: model.text().nullable(), // "24 months standard warranty"
  authorized_dealer: model.boolean().default(false),
  is_oem: model.boolean().default(true), // Original Equipment Manufacturer
  is_active: model.boolean().default(true),
  display_order: model.number().default(0), // For sorting in UI
  metadata: model.json().nullable(),
})

export default Brand 