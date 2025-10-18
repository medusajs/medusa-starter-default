import { 
  createStep, 
  StepResponse 
} from "@medusajs/framework/workflows-sdk"
import { 
  Modules,
  ContainerRegistrationKeys 
} from "@medusajs/framework/utils"
import { INVOICING_MODULE } from "../../../modules/invoicing"
import { INVOICE_SETTINGS_MODULE } from "../../../modules/invoice-settings"
import PdfPrinter from "pdfmake"
import type { TDocumentDefinitions, Content } from "pdfmake/interfaces"
import * as path from "path"

type GenerateInvoicePdfInput = {
  invoice_id: string
}

// PDF fonts configuration - using standard fonts that come with pdfmake
const fonts = {
  Roboto: {
    normal: path.join(process.cwd(), 'node_modules/roboto-font/fonts/Roboto/roboto-regular-webfont.ttf'),
    bold: path.join(process.cwd(), 'node_modules/roboto-font/fonts/Roboto/roboto-bold-webfont.ttf'),
    italics: path.join(process.cwd(), 'node_modules/roboto-font/fonts/Roboto/roboto-italic-webfont.ttf'),
    bolditalics: path.join(process.cwd(), 'node_modules/roboto-font/fonts/Roboto/roboto-bolditalic-webfont.ttf')
  }
}

// Helper function to format currency
const formatCurrency = (amount: number, currencyCode: string = 'EUR', locale: string = 'nl-BE'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
  }).format(amount) // Amount is already in euros, not cents
}

// Helper function to format date
const formatDate = (date: string | Date, format: string = 'dd/MM/yyyy'): string => {
  const dateObj = new Date(date)
  
  switch (format) {
    case 'dd/MM/yyyy':
      return new Intl.DateTimeFormat('nl-BE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(dateObj)
    case 'MM/dd/yyyy':
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(dateObj)
    case 'yyyy-MM-dd':
      return new Intl.DateTimeFormat('sv-SE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(dateObj)
    case 'dd-MM-yyyy':
      return new Intl.DateTimeFormat('nl-NL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(dateObj)
    default:
      return new Intl.DateTimeFormat('nl-BE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(dateObj)
  }
}

export const generateInvoicePdfStep = createStep(
  "generate-invoice-pdf",
  async (input: GenerateInvoicePdfInput, { container }) => {
    const invoicingService = container.resolve(INVOICING_MODULE)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    
    // Get invoice details with line items
    const { data: [invoiceData] } = await query.graph({
      entity: "invoice",
      fields: [
        "id",
        "invoice_number",
        "invoice_date",
        "due_date",
        "customer_id",
        "customer_email",
        "currency_code",
        "subtotal",
        "tax_amount",
        "discount_amount",
        "total_amount",
        "billing_address",
        "shipping_address",
        "notes",
        "payment_terms",
        "line_items.*",
      ],
      filters: {
        id: input.invoice_id,
      },
    })
    
    if (!invoiceData) {
      throw new Error(`Invoice ${input.invoice_id} not found`)
    }

    // Get customer details
    const { data: [customerData] } = await query.graph({
      entity: "customer",
      fields: [
        "id",
        "first_name",
        "last_name",
        "email",
        "phone",
        "company_name",
      ],
      filters: {
        id: invoiceData.customer_id,
      },
    })

    // Get invoice settings from the module
    const invoiceSettingsService = container.resolve(INVOICE_SETTINGS_MODULE) as any
    const dbSettings = await invoiceSettingsService.getActiveSettings()
    
    // Transform flat database structure to nested structure for PDF generation
    let invoiceSettings
    if (dbSettings) {
      invoiceSettings = {
        company: {
          name: dbSettings.company_name,
          address: {
            street: dbSettings.company_address_street,
            city: dbSettings.company_address_city,
            postal_code: dbSettings.company_address_postal_code,
            country: dbSettings.company_address_country,
          },
          contact: {
            email: dbSettings.company_email,
            phone: dbSettings.company_phone,
            website: dbSettings.company_website,
          },
          legal: {
            vat_number: dbSettings.vat_number,
            registration_number: dbSettings.registration_number,
            bank_account: dbSettings.bank_account,
          },
        },
        template: {
          header_color: dbSettings.template_header_color,
          logo_url: dbSettings.template_logo_url,
          footer_text: dbSettings.template_footer_text,
          show_payment_terms: dbSettings.template_show_payment_terms,
          show_due_date: dbSettings.template_show_due_date,
          currency_format: dbSettings.template_currency_format,
          date_format: dbSettings.template_date_format,
        },
        defaults: {
          payment_terms: dbSettings.default_payment_terms,
          due_days: dbSettings.default_due_days,
          tax_rate: dbSettings.default_tax_rate,
          currency_code: dbSettings.default_currency_code,
        },
      }
    } else {
      // Fallback to default settings if none exist in database
      invoiceSettings = {
        company: {
          name: "Your Company Name",
          address: {
            street: "Street Address",
            city: "City",
            postal_code: "Postal Code",
            country: "Belgium"
          },
          contact: {
            email: "info@yourcompany.com",
            phone: "+32 123 456 789"
          },
          legal: {
            vat_number: "BE0123456789"
          }
        },
        template: {
          header_color: "#2c5530",
          show_payment_terms: true,
          show_due_date: true,
          currency_format: "nl-BE",
          date_format: "dd/MM/yyyy"
        },
        defaults: {
          payment_terms: "Payment due within 30 days",
          due_days: 30,
          tax_rate: 0.21,
          currency_code: "EUR"
        }
      }
    }

    // Build PDF document definition
    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      content: [],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          color: invoiceSettings.template.header_color,
          margin: [0, 0, 0, 10] as [number, number, number, number]
        },
        subheader: {
          fontSize: 14,
          bold: true,
          color: invoiceSettings.template.header_color,
          margin: [0, 10, 0, 5] as [number, number, number, number]
        },
        tableHeader: {
          bold: true,
          fontSize: 11,
          color: 'white',
          fillColor: invoiceSettings.template.header_color
        },
        invoiceNumber: {
          fontSize: 24,
          bold: true,
          color: '#d32f2f',
          alignment: 'right'
        },
        small: {
          fontSize: 9,
          color: '#666'
        },
        italic: {
          fontSize: 9,
          italics: true,
          color: '#666'
        }
      }
    }

    const content: Content[] = []

    // Header with company info and invoice number
    content.push({
      columns: [
        {
          width: '*',
          stack: [
            { text: invoiceSettings.company.name, style: 'header' },
            { text: invoiceSettings.company.address.street, fontSize: 10 },
            { text: `${invoiceSettings.company.address.postal_code} ${invoiceSettings.company.address.city}`, fontSize: 10 },
            { text: invoiceSettings.company.address.country, fontSize: 10 },
            { text: `VAT: ${invoiceSettings.company.legal.vat_number}`, fontSize: 10, margin: [0, 5, 0, 0] as [number, number, number, number] },
            ...(invoiceSettings.company.contact.email ? [{ text: invoiceSettings.company.contact.email, fontSize: 10 }] : []),
            ...(invoiceSettings.company.contact.phone ? [{ text: invoiceSettings.company.contact.phone, fontSize: 10 }] : []),
          ]
        },
        {
          width: 'auto',
          stack: [
            { text: `FACTUUR`, fontSize: 16, bold: true, alignment: 'right' },
            { text: invoiceData.invoice_number, style: 'invoiceNumber' },
          ]
        }
      ],
      margin: [0, 0, 0, 20] as [number, number, number, number]
    })

    // Customer and invoice details
    content.push({
      columns: [
        {
          width: '*',
          stack: [
            { text: 'FACTUUR AAN:', style: 'subheader' },
            { 
              text: customerData?.company_name || 
                    `${customerData?.first_name || ''} ${customerData?.last_name || ''}`.trim() || 'Customer',
              bold: true 
            },
            ...(invoiceData.billing_address ? [
              { text: invoiceData.billing_address.address_1 || '', fontSize: 10 },
              { text: `${invoiceData.billing_address.postal_code || ''} ${invoiceData.billing_address.city || ''}`, fontSize: 10 },
              { text: (invoiceData.billing_address.country_code as string)?.toUpperCase() || '', fontSize: 10 },
            ] : []),
            { text: (customerData?.email || invoiceData.customer_email) || '', fontSize: 10, margin: [0, 5, 0, 0] as [number, number, number, number] },
          ]
        },
        {
          width: 'auto',
          stack: [
            { text: 'FACTUURGEGEVENS:', style: 'subheader' },
            {
              table: {
                widths: [100, 100],
                body: [
                  [
                    { text: 'Factuurdatum:', fontSize: 10 },
                    { text: formatDate(invoiceData.invoice_date, invoiceSettings.template.date_format), fontSize: 10, alignment: 'right' as const }
                  ],
                  ...(invoiceSettings.template.show_due_date ? [[
                    { text: 'Vervaldatum:', fontSize: 10 },
                    { text: formatDate(invoiceData.due_date, invoiceSettings.template.date_format), fontSize: 10, alignment: 'right' as const }
                  ]] : []),
                  ...(invoiceSettings.template.show_payment_terms && invoiceData.payment_terms ? [[
                    { text: 'Betalingstermijn:', fontSize: 10 },
                    { text: invoiceData.payment_terms, fontSize: 10, alignment: 'right' as const }
                  ]] : [])
                ]
              },
              layout: 'noBorders'
            }
          ]
        }
      ],
      margin: [0, 0, 0, 30] as [number, number, number, number]
    } as any)

    // Line items table
    const lineItemsBody: any[] = [
      [
        { text: 'Aantal', style: 'tableHeader' },
        { text: 'Beschrijving', style: 'tableHeader' },
        { text: 'Eenheidsprijs', style: 'tableHeader', alignment: 'right' },
        { text: 'BTW', style: 'tableHeader', alignment: 'right' },
        { text: 'Totaal', style: 'tableHeader', alignment: 'right' }
      ]
    ]

    // Add line items with notes
    if (invoiceData.line_items && invoiceData.line_items.length > 0) {
      for (const item of invoiceData.line_items) {
        if (!item) continue
        
        // Build description stack with title, description, and notes
        const descriptionStack: any[] = [
          { text: item.title || '', bold: true }
        ]
        
        if (item.description) {
          descriptionStack.push({ text: item.description, style: 'small', margin: [0, 2, 0, 0] as [number, number, number, number] })
        }
        
        if (item.notes) {
          descriptionStack.push({ 
            text: `Opmerking: ${item.notes}`, 
            style: 'italic', 
            margin: [0, 2, 0, 0] as [number, number, number, number] 
          })
        }

        if (item.sku) {
          descriptionStack.push({ text: `SKU: ${item.sku}`, style: 'small', margin: [0, 2, 0, 0] as [number, number, number, number] })
        }

        lineItemsBody.push([
          { text: (item.quantity || 0).toString(), alignment: 'center' as const },
          { stack: descriptionStack },
          { text: formatCurrency(item.unit_price || 0, invoiceData.currency_code, invoiceSettings.template.currency_format), alignment: 'right' as const },
          { text: `${((item.tax_rate || 0) * 100).toFixed(0)}%`, alignment: 'right' as const },
          { text: formatCurrency(item.total_price || 0, invoiceData.currency_code, invoiceSettings.template.currency_format), alignment: 'right' as const }
        ])
      }
    }

    content.push({
      table: {
        headerRows: 1,
        widths: [50, '*', 80, 50, 80],
        body: lineItemsBody
      },
      layout: {
        fillColor: (rowIndex: number) => {
          return rowIndex === 0 ? '#2c5530' : (rowIndex % 2 === 0 ? '#f9f9f9' : null)
        },
        hLineWidth: (i: number, node: any) => {
          return (i === 0 || i === node.table.body.length) ? 1 : 0.5
        },
        vLineWidth: () => 0,
        hLineColor: () => '#ddd',
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: () => 10,
        paddingBottom: () => 10
      },
      margin: [0, 0, 0, 20] as [number, number, number, number]
    })

    // Totals section
    content.push({
      columns: [
        { width: '*', text: '' },
        {
          width: 250,
          stack: [
            {
              table: {
                widths: ['*', 100],
                body: [
                  [
                    { text: 'Subtotaal:', fontSize: 11 },
                    { text: formatCurrency(invoiceData.subtotal, invoiceData.currency_code, invoiceSettings.template.currency_format), fontSize: 11, alignment: 'right' as const }
                  ],
                  ...(invoiceData.discount_amount > 0 ? [[
                    { text: 'Korting:', fontSize: 11 },
                    { text: `-${formatCurrency(invoiceData.discount_amount, invoiceData.currency_code, invoiceSettings.template.currency_format)}`, fontSize: 11, alignment: 'right' as const }
                  ]] : []),
                  [
                    { text: 'BTW:', fontSize: 11 },
                    { text: formatCurrency(invoiceData.tax_amount, invoiceData.currency_code, invoiceSettings.template.currency_format), fontSize: 11, alignment: 'right' as const }
                  ],
                  [
                    { text: 'Totaal:', fontSize: 14, bold: true, color: invoiceSettings.template.header_color },
                    { text: formatCurrency(invoiceData.total_amount, invoiceData.currency_code, invoiceSettings.template.currency_format), fontSize: 14, bold: true, color: invoiceSettings.template.header_color, alignment: 'right' as const }
                  ]
                ]
              },
              layout: {
                hLineWidth: (i: number, node: any) => {
                  return i === node.table.body.length - 1 ? 2 : 0.5
                },
                vLineWidth: () => 0,
                hLineColor: (i: number, node: any) => {
                  return i === node.table.body.length - 1 ? invoiceSettings.template.header_color : '#ddd'
                },
                paddingTop: () => 5,
                paddingBottom: () => 5
              }
            }
          ]
        }
      ]
    } as any)

    // Notes section
    if (invoiceData.notes) {
      content.push({
        text: 'Opmerkingen:',
        style: 'subheader',
        margin: [0, 20, 0, 5] as [number, number, number, number]
      })
      content.push({
        text: invoiceData.notes,
        fontSize: 10,
        margin: [0, 0, 0, 20] as [number, number, number, number]
      })
    }

    // Footer
    const footerText = invoiceSettings.template.footer_text || 
      (invoiceSettings.company.legal.bank_account 
        ? `Gelieve het factuurbedrag over te maken op rekeningnummer ${invoiceSettings.company.legal.bank_account} met vermelding van het factuurnummer.`
        : 'Gelieve het factuurbedrag over te maken met vermelding van het factuurnummer.')
    
    content.push({
      text: footerText,
      fontSize: 9,
      color: '#666',
      margin: [0, 30, 0, 0] as [number, number, number, number]
    })

    docDefinition.content = content

    try {
      // Generate PDF using pdfmake
      const printer = new PdfPrinter(fonts)
      const pdfDoc = printer.createPdfKitDocument(docDefinition)
      
      // Collect PDF chunks
      const chunks: Buffer[] = []
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk))
      
      // Wait for PDF generation to complete
      await new Promise<void>((resolve, reject) => {
        pdfDoc.on('end', () => resolve())
        pdfDoc.on('error', reject)
        pdfDoc.end()
      })

      const pdfBuffer = Buffer.concat(chunks)
      
      // Return PDF as buffer (following Medusa's recommended pattern)
      // The buffer will be serialized by the workflow
      return new StepResponse({ 
        pdf_buffer: Array.from(pdfBuffer), // Convert to array for serialization
        invoice: invoiceData 
      }, null)
      
    } catch (error) {
      console.error("Failed to generate PDF:", error)
      throw new Error(`Failed to generate PDF for invoice ${input.invoice_id}: ${error.message}`)
    }
  },
  async (data, { container }) => {
    // No compensation needed since we're not storing files
    return
  }
)
 