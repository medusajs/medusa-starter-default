import { model } from "@medusajs/framework/utils"

const Supplier = model.define("supplier", {
  id: model.id().primaryKey(),
  name: model.text().searchable(),
  code: model.text().unique().nullable(), // Supplier code like "SUP001"
  email: model.text().nullable(),
  phone: model.text().nullable(),
  website: model.text().nullable(),
  contact_person: model.text().nullable(),
  address_line_1: model.text().nullable(),
  address_line_2: model.text().nullable(),
  city: model.text().nullable(),
  state: model.text().nullable(),
  postal_code: model.text().nullable(),
  country: model.text().nullable(),
  tax_id: model.text().nullable(),
  payment_terms: model.text().nullable(), // e.g., "Net 30", "COD"
  currency_code: model.text().default("USD"),
  is_active: model.boolean().default(true),
  notes: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default Supplier 