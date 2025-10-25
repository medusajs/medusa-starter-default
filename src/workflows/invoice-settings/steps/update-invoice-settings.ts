import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { INVOICE_SETTINGS_MODULE } from "../../../modules/invoice-settings"

type StepInput = {
  company_name?: string
  company_address_street?: string
  company_address_city?: string
  company_address_postal_code?: string
  company_address_country?: string
  company_email?: string
  company_phone?: string
  company_website?: string
  vat_number?: string
  registration_number?: string
  bank_account?: string
  template_header_color?: string
  template_logo_url?: string
  template_footer_text?: string
  template_show_payment_terms?: boolean
  template_show_due_date?: boolean
  template_currency_format?: string
  template_date_format?: string
  default_payment_terms?: string
  default_due_days?: number
  default_tax_rate?: number
  default_currency_code?: string
}

export const updateInvoiceSettingsStep = createStep(
  "update-invoice-settings",
  async (updateData: StepInput, { container }) => {
    const invoiceSettingsService = container.resolve(INVOICE_SETTINGS_MODULE)
    const prevData = await invoiceSettingsService.getActiveSettings()
    const updatedData = await invoiceSettingsService.updateSettings(updateData)
    return new StepResponse(updatedData, prevData)
  },
  async (prevSettings, { container }) => {
    if (!prevSettings) {
      return
    }
    const invoiceSettingsService = container.resolve(INVOICE_SETTINGS_MODULE)
    await invoiceSettingsService.updateSettings(prevSettings)
  }
)





