import { model } from "@medusajs/framework/utils"

const InvoiceSettings = model.define("invoice_settings", {
  id: model.id().primaryKey(),
  company_name: model.text(),
  company_address_street: model.text(),
  company_address_city: model.text(),
  company_address_postal_code: model.text(),
  company_address_country: model.text(),
  company_email: model.text(),
  company_phone: model.text(),
  company_website: model.text().nullable(),
  vat_number: model.text(),
  registration_number: model.text().nullable(),
  bank_account: model.text().nullable(),
  template_header_color: model.text().default("#2c5530"),
  template_logo_url: model.text().nullable(),
  template_footer_text: model.text().nullable(),
  template_show_payment_terms: model.boolean().default(true),
  template_show_due_date: model.boolean().default(true),
  template_currency_format: model.text().default("nl-BE"),
  template_date_format: model.text().default("dd/MM/yyyy"),
  default_payment_terms: model.text(),
  default_due_days: model.number().default(30),
  default_tax_rate: model.number().default(0.21),
  default_currency_code: model.text().default("EUR"),
})

export default InvoiceSettings

