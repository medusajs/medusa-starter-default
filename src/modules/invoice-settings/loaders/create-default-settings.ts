import {
  LoaderOptions,
  IMedusaInternalService,
} from "@medusajs/framework/types"
import InvoiceSettings from "../models/invoice-settings"

export default async function createDefaultSettingsLoader({
  container,
}: LoaderOptions) {
  const service: IMedusaInternalService<typeof InvoiceSettings> = 
    container.resolve("invoiceSettingsService")

  const [_, count] = await service.listAndCount()

  if (count > 0) {
    return
  }

  await service.create({
    company_name: "Your Company Name",
    company_address_street: "Street Address",
    company_address_city: "City",
    company_address_postal_code: "Postal Code",
    company_address_country: "Belgium",
    company_email: "info@yourcompany.com",
    company_phone: "+32 123 456 789",
    vat_number: "BE0123456789",
    template_header_color: "#2c5530",
    template_show_payment_terms: true,
    template_show_due_date: true,
    template_currency_format: "nl-BE",
    template_date_format: "dd/MM/yyyy",
    default_payment_terms: "Payment due within 30 days",
    default_due_days: 30,
    default_tax_rate: 0.21,
    default_currency_code: "EUR",
  })
}




