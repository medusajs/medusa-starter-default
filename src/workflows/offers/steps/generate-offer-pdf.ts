import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { OFFER_MODULE } from "../../../modules/offers"
import PdfPrinter from "pdfmake"
import type { TDocumentDefinitions } from "pdfmake/interfaces"
import * as path from "path"

// PDF fonts configuration - using Roboto fonts from node_modules
const fonts = {
  Roboto: {
    normal: path.join(process.cwd(), 'node_modules/roboto-font/fonts/Roboto/roboto-regular-webfont.ttf'),
    bold: path.join(process.cwd(), 'node_modules/roboto-font/fonts/Roboto/roboto-bold-webfont.ttf'),
    italics: path.join(process.cwd(), 'node_modules/roboto-font/fonts/Roboto/roboto-italic-webfont.ttf'),
    bolditalics: path.join(process.cwd(), 'node_modules/roboto-font/fonts/Roboto/roboto-bolditalic-webfont.ttf')
  }
}

type GenerateOfferPdfInput = {
  offer_id: string
}

// Helper function to format currency
const formatCurrency = (amount: number, currencyCode: string = 'EUR', locale: string = 'nl-BE'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
  }).format(amount)
}

// Helper function to format date
const formatDate = (date: string | Date): string => {
  const dateObj = new Date(date)
  return new Intl.DateTimeFormat('nl-BE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dateObj)
}

/**
 * Step to generate a PDF document for an offer
 * Returns PDF buffer that can be saved or emailed
 * Following MedusaJS best practices and invoice PDF generation pattern
 */
export const generateOfferPdfStep = createStep(
  "generate-offer-pdf",
  async (input: GenerateOfferPdfInput, { container }) => {
    const offerService = container.resolve(OFFER_MODULE)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    // Get offer details with line items using Query API
    const { data: [offerData] } = await query.graph({
      entity: "offer",
      fields: [
        "id",
        "offer_number",
        "offer_date",
        "valid_until",
        "customer_id",
        "customer_email",
        "customer_phone",
        "currency_code",
        "subtotal",
        "tax_amount",
        "discount_amount",
        "total_amount",
        "billing_address",
        "shipping_address",
        "notes",
        "terms_and_conditions",
        "line_items.*",
      ],
      filters: {
        id: input.offer_id,
      },
    })

    if (!offerData) {
      throw new Error(`Offer ${input.offer_id} not found`)
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
        id: offerData.customer_id,
      },
    })

    // Color palette for modern design
    const colorPalette = {
      primary: '#1a1a2e',
      accent: '#0f4c75',
      accentLight: '#3282b8',
      success: '#16db93',
      text: {
        primary: '#2d3436',
        secondary: '#636e72',
        muted: '#95a5a6',
      },
      background: {
        light: '#f8f9fa',
        lighter: '#ffffff',
        subtle: '#f1f3f5',
      }
    }

    // Build PDF document definition
    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [50, 70, 50, 70],
      content: [
        // Header
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: 'OFFERTE', fontSize: 20, bold: true, color: colorPalette.primary },
                { text: offerData.offer_number, fontSize: 32, bold: true, color: colorPalette.primary, margin: [0, 4, 0, 0] as [number, number, number, number] },
              ]
            },
            {
              width: 'auto',
              stack: [
                { text: 'Datum', fontSize: 9, color: colorPalette.text.secondary },
                { text: formatDate(offerData.offer_date), fontSize: 10, color: colorPalette.text.primary, margin: [0, 2, 0, 8] as [number, number, number, number] },
                { text: 'Geldig tot', fontSize: 9, color: colorPalette.text.secondary },
                { text: formatDate(offerData.valid_until), fontSize: 10, color: colorPalette.text.primary, margin: [0, 2, 0, 0] as [number, number, number, number] },
              ]
            }
          ],
          margin: [0, 0, 0, 40] as [number, number, number, number]
        },

        // Customer Information
        {
          text: 'KLANT',
          fontSize: 11,
          bold: true,
          color: colorPalette.text.secondary,
          margin: [0, 0, 0, 8] as [number, number, number, number]
        },
        {
          text: customerData?.company_name ||
                `${customerData?.first_name || ''} ${customerData?.last_name || ''}`.trim() || 'Customer',
          fontSize: 12,
          bold: true,
          color: colorPalette.text.primary,
          margin: [0, 0, 0, 6] as [number, number, number, number]
        },
        ...(offerData.billing_address ? [
          { text: offerData.billing_address.address_1 || '', fontSize: 9, color: colorPalette.text.secondary, margin: [0, 0, 0, 2] as [number, number, number, number] },
          { text: `${offerData.billing_address.postal_code || ''} ${offerData.billing_address.city || ''}`, fontSize: 9, color: colorPalette.text.secondary, margin: [0, 0, 0, 2] as [number, number, number, number] },
        ] : []),
        { text: offerData.customer_email || '', fontSize: 9, color: colorPalette.accentLight, margin: [0, 4, 0, 0] as [number, number, number, number] },
        ...(offerData.customer_phone ? [{ text: offerData.customer_phone, fontSize: 9, color: colorPalette.text.secondary, margin: [0, 2, 0, 0] as [number, number, number, number] }] : []),

        // Line Items Table
        {
          table: {
            headerRows: 1,
            widths: [45, '*', 75, 45, 85],
            body: [
              [
                { text: 'QTY', fontSize: 10, bold: true, color: colorPalette.text.primary, alignment: 'center' as const },
                { text: 'BESCHRIJVING', fontSize: 10, bold: true, color: colorPalette.text.primary },
                { text: 'PRIJS', fontSize: 10, bold: true, color: colorPalette.text.primary, alignment: 'right' as const },
                { text: 'BTW', fontSize: 10, bold: true, color: colorPalette.text.primary, alignment: 'center' as const },
                { text: 'TOTAAL', fontSize: 10, bold: true, color: colorPalette.text.primary, alignment: 'right' as const }
              ],
              ...(offerData.line_items || []).map((item: any) => [
                {
                  text: (item.quantity || 0).toString(),
                  alignment: 'center' as const,
                  fontSize: 10,
                  color: colorPalette.text.primary
                },
                {
                  stack: [
                    { text: item.title || '', fontSize: 10, bold: true, color: colorPalette.text.primary },
                    ...(item.description ? [{ text: item.description, fontSize: 9, color: colorPalette.text.secondary, margin: [0, 3, 0, 0] as [number, number, number, number] }] : []),
                    ...(item.sku ? [{ text: `SKU: ${item.sku}`, fontSize: 8, color: colorPalette.text.muted, margin: [0, 3, 0, 0] as [number, number, number, number] }] : []),
                  ]
                },
                {
                  text: formatCurrency(item.unit_price || 0, offerData.currency_code),
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
                  text: formatCurrency((item.total_price || 0) + (item.tax_amount || 0), offerData.currency_code),
                  alignment: 'right' as const,
                  fontSize: 10,
                  bold: true,
                  color: colorPalette.text.primary
                }
              ])
            ]
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
          margin: [0, 40, 0, 30] as [number, number, number, number]
        },

        // Totals
        {
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
                        { text: 'Subtotaal', fontSize: 10, color: colorPalette.text.secondary, border: [false, false, false, false] },
                        { text: formatCurrency(offerData.subtotal, offerData.currency_code), fontSize: 10, color: colorPalette.text.primary, alignment: 'right' as const, border: [false, false, false, false] }
                      ],
                      ...(offerData.discount_amount > 0 ? [[
                        { text: 'Korting', fontSize: 10, color: colorPalette.text.secondary, border: [false, false, false, false] },
                        { text: `-${formatCurrency(offerData.discount_amount, offerData.currency_code)}`, fontSize: 10, color: colorPalette.success, alignment: 'right' as const, border: [false, false, false, false] }
                      ]] : []),
                      [
                        { text: 'BTW', fontSize: 10, color: colorPalette.text.secondary, border: [false, false, false, false] },
                        { text: formatCurrency(offerData.tax_amount, offerData.currency_code), fontSize: 10, color: colorPalette.text.primary, alignment: 'right' as const, border: [false, false, false, false] }
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
                  table: {
                    widths: ['*', 'auto'],
                    body: [
                      [
                        { text: 'TOTAAL', fontSize: 13, bold: true, color: colorPalette.primary, border: [false, false, false, false] },
                        { text: formatCurrency(offerData.total_amount, offerData.currency_code), fontSize: 16, bold: true, color: colorPalette.primary, alignment: 'right' as const, border: [false, false, false, false] }
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
                  }
                }
              ]
            }
          ]
        },

        // Notes
        ...(offerData.notes ? [{
          stack: [
            { text: 'OPMERKINGEN', fontSize: 11, bold: true, color: colorPalette.text.secondary, margin: [0, 30, 0, 12] as [number, number, number, number] },
            {
              table: {
                widths: ['*'],
                body: [[{ text: offerData.notes, fontSize: 9, color: colorPalette.text.primary, border: [false, false, false, false], lineHeight: 1.5 }]]
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
        }] : []),

        // Terms and Conditions
        ...(offerData.terms_and_conditions ? [{
          stack: [
            { text: 'VOORWAARDEN', fontSize: 11, bold: true, color: colorPalette.text.secondary, margin: [0, 20, 0, 12] as [number, number, number, number] },
            { text: offerData.terms_and_conditions, fontSize: 8, color: colorPalette.text.muted, lineHeight: 1.4 }
          ]
        }] : []),
      ],
      styles: {
        header: { fontSize: 20, bold: true, color: colorPalette.primary },
        subheader: { fontSize: 11, bold: true, color: colorPalette.text.secondary },
        body: { fontSize: 10, color: colorPalette.text.primary, lineHeight: 1.4 },
      },
      defaultStyle: {
        font: 'Roboto'
      }
    }

    try {
      // Generate PDF using PdfPrinter (following invoice pattern)
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
      return new StepResponse({ 
        pdf_buffer: Array.from(pdfBuffer), // Convert to array for serialization
        offer: offerData,
        filename: `${offerData.offer_number}.pdf`
      }, null)
      
    } catch (error: any) {
      console.error("Failed to generate PDF:", error)
      throw new Error(`Failed to generate PDF for offer ${input.offer_id}: ${error.message}`)
    }
  },
  async (data, { container }) => {
    // No compensation needed since we're not storing files
    return
  }
)
