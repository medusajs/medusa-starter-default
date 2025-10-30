import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { INVOICE_SETTINGS_MODULE } from "../../../modules/invoice-settings"
import { updateInvoiceSettingsWorkflow } from "../../../workflows/invoice-settings/update-invoice-settings"

// Type definitions for request bodies
type UpdateInvoiceSettingsRequest = {
  settings: {
    company?: {
      name?: string
      address?: {
        street?: string
        city?: string
        postal_code?: string
        country?: string
      }
      contact?: {
        email?: string
        phone?: string
        website?: string
      }
      legal?: {
        vat_number?: string
        registration_number?: string
        bank_account?: string
      }
    }
    template?: {
      header_color?: string
      logo_url?: string
      footer_text?: string
      show_payment_terms?: boolean
      show_due_date?: boolean
      currency_format?: string
      date_format?: string
    }
    defaults?: {
      payment_terms?: string
      due_days?: number
      tax_rate?: number
      currency_code?: string
    }
  }
}

// Helper function to transform flat database model to nested structure for frontend
function transformToNestedStructure(settings: any) {
  if (!settings) return null
  
  return {
    company: {
      name: settings.company_name,
      address: {
        street: settings.company_address_street,
        city: settings.company_address_city,
        postal_code: settings.company_address_postal_code,
        country: settings.company_address_country,
      },
      contact: {
        email: settings.company_email,
        phone: settings.company_phone,
        website: settings.company_website,
      },
      legal: {
        vat_number: settings.vat_number,
        registration_number: settings.registration_number,
        bank_account: settings.bank_account,
      },
    },
    template: {
      header_color: settings.template_header_color,
      logo_url: settings.template_logo_url,
      footer_text: settings.template_footer_text,
      show_payment_terms: settings.template_show_payment_terms,
      show_due_date: settings.template_show_due_date,
      currency_format: settings.template_currency_format,
      date_format: settings.template_date_format,
    },
    defaults: {
      payment_terms: settings.default_payment_terms,
      due_days: settings.default_due_days,
      tax_rate: settings.default_tax_rate,
      currency_code: settings.default_currency_code,
    },
  }
}

// Helper function to transform nested structure to flat database model
function transformToFlatStructure(settings: any) {
  return {
    company_name: settings.company?.name,
    company_address_street: settings.company?.address?.street,
    company_address_city: settings.company?.address?.city,
    company_address_postal_code: settings.company?.address?.postal_code,
    company_address_country: settings.company?.address?.country,
    company_email: settings.company?.contact?.email,
    company_phone: settings.company?.contact?.phone,
    company_website: settings.company?.contact?.website,
    vat_number: settings.company?.legal?.vat_number,
    registration_number: settings.company?.legal?.registration_number,
    bank_account: settings.company?.legal?.bank_account,
    template_header_color: settings.template?.header_color,
    template_logo_url: settings.template?.logo_url,
    template_footer_text: settings.template?.footer_text,
    template_show_payment_terms: settings.template?.show_payment_terms,
    template_show_due_date: settings.template?.show_due_date,
    template_currency_format: settings.template?.currency_format,
    template_date_format: settings.template?.date_format,
    default_payment_terms: settings.defaults?.payment_terms,
    default_due_days: settings.defaults?.due_days,
    default_tax_rate: settings.defaults?.tax_rate,
    default_currency_code: settings.defaults?.currency_code,
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const invoiceSettingsService = req.scope.resolve(INVOICE_SETTINGS_MODULE)
    const settings = await invoiceSettingsService.getActiveSettings()
    
    const transformedSettings = transformToNestedStructure(settings)
    res.json({ settings: transformedSettings })
  } catch (error) {
    console.error("Error fetching invoice settings:", error)
    res.status(500).json({ 
      error: "Failed to fetch invoice settings",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function PUT(req: MedusaRequest<UpdateInvoiceSettingsRequest>, res: MedusaResponse) {
  try {
    const { settings } = req.body
    
    // Validate required fields
    if (settings.company?.name && settings.company.name.trim() === "") {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "Company name is required" 
      })
    }
    
    if (settings.company?.legal?.vat_number && settings.company.legal.vat_number.trim() === "") {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "VAT number is required" 
      })
    }
    
    // Transform nested structure to flat structure for database
    const flatSettings = transformToFlatStructure(settings)
    
    // Use workflow to update settings
    const { result } = await updateInvoiceSettingsWorkflow(req.scope).run({
      input: flatSettings
    })
    
    // Transform back to nested structure for response
    const transformedResult = transformToNestedStructure(result)
    res.json({ settings: transformedResult })
  } catch (error) {
    console.error("Error updating invoice settings:", error)
    res.status(500).json({ 
      error: "Failed to update invoice settings",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}
