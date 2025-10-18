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

    // Modern color palette - elegant and minimalistic
    const colorPalette = {
      primary: invoiceSettings.template.header_color || '#1a1a2e',      // Deep navy/custom
      accent: '#0f4c75',           // Sophisticated blue
      accentLight: '#3282b8',      // Light blue for highlights
      success: '#16db93',          // Modern mint green
      text: {
        primary: '#2d3436',        // Almost black, softer than pure black
        secondary: '#636e72',      // Medium grey
        muted: '#95a5a6',          // Light grey
      },
      background: {
        light: '#f8f9fa',          // Very light grey
        lighter: '#ffffff',        // Pure white
        subtle: '#f1f3f5',         // Subtle grey
      }
    }

    // Build PDF document definition with modern design system
    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [50, 70, 50, 70], // Increased margins for elegance
      content: [],
      styles: {
        header: {
          fontSize: 20,
          bold: true,
          color: colorPalette.primary,
          margin: [0, 0, 0, 4] as [number, number, number, number]
        },
        subheader: {
          fontSize: 11,
          bold: true,
          color: colorPalette.text.secondary,
          margin: [0, 0, 0, 8] as [number, number, number, number]
        },
        tableHeader: {
          bold: true,
          fontSize: 10,
          color: colorPalette.text.primary,
          margin: [0, 0, 0, 0] as [number, number, number, number]
        },
        invoiceTitle: {
          fontSize: 11,
          bold: true,
          color: colorPalette.text.muted,
          alignment: 'right'
        },
        invoiceNumber: {
          fontSize: 32,
          bold: true,
          color: colorPalette.primary,
          alignment: 'right',
          margin: [0, 4, 0, 0] as [number, number, number, number]
        },
        body: {
          fontSize: 10,
          color: colorPalette.text.primary,
          lineHeight: 1.4
        },
        small: {
          fontSize: 9,
          color: colorPalette.text.secondary,
          lineHeight: 1.3
        },
        italic: {
          fontSize: 9,
          italics: true,
          color: colorPalette.text.muted,
          lineHeight: 1.3
        },
        label: {
          fontSize: 9,
          color: colorPalette.text.secondary,
          bold: true
        },
        value: {
          fontSize: 10,
          color: colorPalette.text.primary
        },
        totalLabel: {
          fontSize: 13,
          bold: true,
          color: colorPalette.primary
        },
        totalValue: {
          fontSize: 16,
          bold: true,
          color: colorPalette.primary
        }
      },
      defaultStyle: {
        font: 'Roboto'
      }
    }

    const content: Content[] = []

    // Modern header with elegant spacing
    content.push({
      columns: [
        {
          width: '*',
          stack: [
            { text: invoiceSettings.company.name, style: 'header' },
            { text: invoiceSettings.company.address.street, fontSize: 10, color: colorPalette.text.secondary, margin: [0, 8, 0, 2] as [number, number, number, number] },
            { text: `${invoiceSettings.company.address.postal_code} ${invoiceSettings.company.address.city}`, fontSize: 10, color: colorPalette.text.secondary, margin: [0, 0, 0, 2] as [number, number, number, number] },
            { text: invoiceSettings.company.address.country, fontSize: 10, color: colorPalette.text.secondary },
            {
              canvas: [{
                type: 'line',
                x1: 0, y1: 0,
                x2: 80, y2: 0,
                lineWidth: 2,
                lineColor: colorPalette.accentLight
              }],
              margin: [0, 12, 0, 12] as [number, number, number, number]
            },
            { text: `VAT ${invoiceSettings.company.legal.vat_number}`, fontSize: 9, color: colorPalette.text.muted, bold: true },
            ...(invoiceSettings.company.contact.email ? [{ text: invoiceSettings.company.contact.email, fontSize: 9, color: colorPalette.text.secondary, margin: [0, 4, 0, 0] as [number, number, number, number] }] : []),
            ...(invoiceSettings.company.contact.phone ? [{ text: invoiceSettings.company.contact.phone, fontSize: 9, color: colorPalette.text.secondary, margin: [0, 2, 0, 0] as [number, number, number, number] }] : []),
          ]
        },
        {
          width: 'auto',
          stack: [
            { text: 'FACTUUR', style: 'invoiceTitle' },
            { text: invoiceData.invoice_number, style: 'invoiceNumber' },
          ]
        }
      ],
      margin: [0, 0, 0, 40] as [number, number, number, number]
    })

    // Customer and invoice details with modern card-like styling
    content.push({
      columns: [
        {
          width: '*',
          stack: [
            { text: 'FACTUUR AAN', style: 'subheader' },
            {
              text: customerData?.company_name ||
                    `${customerData?.first_name || ''} ${customerData?.last_name || ''}`.trim() || 'Customer',
              fontSize: 12,
              bold: true,
              color: colorPalette.text.primary,
              margin: [0, 0, 0, 6] as [number, number, number, number]
            },
            ...(invoiceData.billing_address ? [
              { text: invoiceData.billing_address.address_1 || '', fontSize: 9, color: colorPalette.text.secondary, margin: [0, 0, 0, 2] as [number, number, number, number] },
              { text: `${invoiceData.billing_address.postal_code || ''} ${invoiceData.billing_address.city || ''}`, fontSize: 9, color: colorPalette.text.secondary, margin: [0, 0, 0, 2] as [number, number, number, number] },
              { text: (invoiceData.billing_address.country_code as string)?.toUpperCase() || '', fontSize: 9, color: colorPalette.text.secondary },
            ] : []),
            { text: (customerData?.email || invoiceData.customer_email) || '', fontSize: 9, color: colorPalette.accentLight, margin: [0, 8, 0, 0] as [number, number, number, number] },
          ]
        },
        {
          width: 200,
          stack: [
            { text: 'FACTUURGEGEVENS', style: 'subheader' },
            {
              table: {
                widths: ['*', 'auto'],
                body: [
                  [
                    { text: 'Factuurdatum', style: 'label', border: [false, false, false, false] },
                    { text: formatDate(invoiceData.invoice_date, invoiceSettings.template.date_format), style: 'value', alignment: 'right' as const, border: [false, false, false, false] }
                  ],
                  ...(invoiceSettings.template.show_due_date ? [[
                    { text: 'Vervaldatum', style: 'label', border: [false, false, false, false] },
                    { text: formatDate(invoiceData.due_date, invoiceSettings.template.date_format), style: 'value', alignment: 'right' as const, border: [false, false, false, false] }
                  ]] : []),
                  ...(invoiceSettings.template.show_payment_terms && invoiceData.payment_terms ? [[
                    { text: 'Betalingstermijn', style: 'label', border: [false, false, false, false] },
                    { text: invoiceData.payment_terms, style: 'value', alignment: 'right' as const, border: [false, false, false, false] }
                  ]] : [])
                ]
              },
              layout: {
                paddingTop: () => 4,
                paddingBottom: () => 4,
                paddingLeft: () => 0,
                paddingRight: () => 0,
                hLineWidth: () => 0,
                vLineWidth: () => 0
              }
            }
          ]
        }
      ],
      margin: [0, 0, 0, 40] as [number, number, number, number]
    } as any)

    // Modern line items table with clean design
    const lineItemsBody: any[] = [
      [
        { text: 'QTY', style: 'tableHeader', alignment: 'center' as const },
        { text: 'BESCHRIJVING', style: 'tableHeader' },
        { text: 'PRIJS', style: 'tableHeader', alignment: 'right' as const },
        { text: 'BTW', style: 'tableHeader', alignment: 'center' as const },
        { text: 'TOTAAL', style: 'tableHeader', alignment: 'right' as const }
      ]
    ]

    // Add line items with enhanced styling
    if (invoiceData.line_items && invoiceData.line_items.length > 0) {
      for (const item of invoiceData.line_items) {
        if (!item) continue

        // Build description stack with elegant formatting
        const descriptionStack: any[] = [
          { text: item.title || '', fontSize: 10, bold: true, color: colorPalette.text.primary }
        ]

        if (item.description) {
          descriptionStack.push({
            text: item.description,
            fontSize: 9,
            color: colorPalette.text.secondary,
            margin: [0, 3, 0, 0] as [number, number, number, number]
          })
        }

        if (item.notes) {
          descriptionStack.push({
            text: `${item.notes}`,
            fontSize: 8,
            italics: true,
            color: colorPalette.text.muted,
            margin: [0, 3, 0, 0] as [number, number, number, number]
          })
        }

        if (item.sku) {
          descriptionStack.push({
            text: `SKU: ${item.sku}`,
            fontSize: 8,
            color: colorPalette.text.muted,
            margin: [0, 3, 0, 0] as [number, number, number, number]
          })
        }

        lineItemsBody.push([
          {
            text: (item.quantity || 0).toString(),
            alignment: 'center' as const,
            fontSize: 10,
            color: colorPalette.text.primary
          },
          { stack: descriptionStack },
          {
            text: formatCurrency(item.unit_price || 0, invoiceData.currency_code, invoiceSettings.template.currency_format),
            alignment: 'right' as const,
            fontSize: 10,
            color: colorPalette.text.primary
          },
          {
            text: `${((item.tax_rate || 0) * 100).toFixed(0)}%`,
            alignment: 'center' as const,
            fontSize: 9,
            color: colorPalette.text.secondary
          },
          {
            text: formatCurrency(item.total_price || 0, invoiceData.currency_code, invoiceSettings.template.currency_format),
            alignment: 'right' as const,
            fontSize: 10,
            bold: true,
            color: colorPalette.text.primary
          }
        ])
      }
    }

    content.push({
      table: {
        headerRows: 1,
        widths: [45, '*', 75, 45, 85],
        body: lineItemsBody
      },
      layout: {
        fillColor: (rowIndex: number) => {
          return rowIndex === 0 ? colorPalette.background.subtle : (rowIndex % 2 === 0 ? null : colorPalette.background.light)
        },
        hLineWidth: (i: number, node: any) => {
          if (i === 0) return 0
          if (i === 1) return 2
          if (i === node.table.body.length) return 2
          return 0
        },
        vLineWidth: () => 0,
        hLineColor: (i: number, node: any) => {
          if (i === 1) return colorPalette.accentLight
          if (i === node.table.body.length) return colorPalette.background.subtle
          return colorPalette.background.subtle
        },
        paddingLeft: () => 12,
        paddingRight: () => 12,
        paddingTop: () => 12,
        paddingBottom: () => 12
      },
      margin: [0, 0, 0, 30] as [number, number, number, number]
    })

    // Modern totals section with elegant card design
    content.push({
      columns: [
        { width: '*', text: '' },
        {
          width: 260,
          stack: [
            {
              table: {
                widths: ['*', 'auto'],
                body: [
                  [
                    {
                      text: 'Subtotaal',
                      fontSize: 10,
                      color: colorPalette.text.secondary,
                      border: [false, false, false, false]
                    },
                    {
                      text: formatCurrency(invoiceData.subtotal, invoiceData.currency_code, invoiceSettings.template.currency_format),
                      fontSize: 10,
                      color: colorPalette.text.primary,
                      alignment: 'right' as const,
                      border: [false, false, false, false]
                    }
                  ],
                  ...(invoiceData.discount_amount > 0 ? [[
                    {
                      text: 'Korting',
                      fontSize: 10,
                      color: colorPalette.text.secondary,
                      border: [false, false, false, false]
                    },
                    {
                      text: `-${formatCurrency(invoiceData.discount_amount, invoiceData.currency_code, invoiceSettings.template.currency_format)}`,
                      fontSize: 10,
                      color: colorPalette.success,
                      alignment: 'right' as const,
                      border: [false, false, false, false]
                    }
                  ]] : []),
                  [
                    {
                      text: 'BTW',
                      fontSize: 10,
                      color: colorPalette.text.secondary,
                      border: [false, false, false, false]
                    },
                    {
                      text: formatCurrency(invoiceData.tax_amount, invoiceData.currency_code, invoiceSettings.template.currency_format),
                      fontSize: 10,
                      color: colorPalette.text.primary,
                      alignment: 'right' as const,
                      border: [false, false, false, false]
                    }
                  ]
                ]
              },
              layout: {
                paddingTop: () => 8,
                paddingBottom: () => 8,
                paddingLeft: () => 16,
                paddingRight: () => 16,
                hLineWidth: () => 0,
                vLineWidth: () => 0,
                fillColor: () => colorPalette.background.light
              }
            },
            {
              canvas: [{
                type: 'rect',
                x: 0,
                y: 0,
                w: 260,
                h: 50,
                r: 4,
                color: colorPalette.primary,
                fillOpacity: 0.05
              }],
              absolutePosition: { x: 0, y: 0 }
            },
            {
              table: {
                widths: ['*', 'auto'],
                body: [
                  [
                    {
                      text: 'TOTAAL',
                      style: 'totalLabel',
                      border: [false, false, false, false]
                    },
                    {
                      text: formatCurrency(invoiceData.total_amount, invoiceData.currency_code, invoiceSettings.template.currency_format),
                      style: 'totalValue',
                      alignment: 'right' as const,
                      border: [false, false, false, false]
                    }
                  ]
                ]
              },
              layout: {
                paddingTop: () => 12,
                paddingBottom: () => 12,
                paddingLeft: () => 16,
                paddingRight: () => 16,
                hLineWidth: (i: number) => i === 0 ? 2 : 0,
                vLineWidth: () => 0,
                hLineColor: () => colorPalette.accentLight
              },
              margin: [0, 0, 0, 0] as [number, number, number, number]
            }
          ]
        }
      ]
    } as any)

    // Notes section with elegant styling
    if (invoiceData.notes) {
      content.push({
        stack: [
          {
            text: 'OPMERKINGEN',
            style: 'subheader',
            margin: [0, 30, 0, 12] as [number, number, number, number]
          },
          {
            table: {
              widths: ['*'],
              body: [[{
                text: invoiceData.notes,
                fontSize: 9,
                color: colorPalette.text.primary,
                border: [false, false, false, false],
                lineHeight: 1.5
              }]]
            },
            layout: {
              paddingLeft: () => 16,
              paddingRight: () => 16,
              paddingTop: () => 12,
              paddingBottom: () => 12,
              hLineWidth: () => 0,
              vLineWidth: () => 0,
              fillColor: () => colorPalette.background.light
            }
          }
        ]
      })
    }

    // Modern footer with payment information
    const footerText = invoiceSettings.template.footer_text ||
      (invoiceSettings.company.legal.bank_account
        ? `Gelieve het factuurbedrag over te maken op rekeningnummer ${invoiceSettings.company.legal.bank_account} met vermelding van het factuurnummer.`
        : 'Gelieve het factuurbedrag over te maken met vermelding van het factuurnummer.')

    content.push({
      stack: [
        {
          canvas: [{
            type: 'line',
            x1: 0, y1: 0,
            x2: 515, y2: 0,
            lineWidth: 1,
            lineColor: colorPalette.background.subtle
          }],
          margin: [0, 40, 0, 20] as [number, number, number, number]
        },
        {
          text: footerText,
          fontSize: 9,
          color: colorPalette.text.secondary,
          alignment: 'center',
          lineHeight: 1.4
        },
        ...(invoiceSettings.company.contact.website ? [{
          text: invoiceSettings.company.contact.website,
          fontSize: 8,
          color: colorPalette.accentLight,
          alignment: 'center' as const,
          margin: [0, 8, 0, 0] as [number, number, number, number]
        }] : [])
      ]
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
 