import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { OFFER_MODULE } from "../../../modules/offers"
// @ts-ignore - pdfmake types may not be available
import * as pdfMake from "pdfmake/build/pdfmake"
// @ts-ignore - pdfmake types may not be available
import * as pdfFonts from "pdfmake/build/vfs_fonts"

// Initialize pdfmake with fonts
if (pdfMake.vfs === undefined) {
  pdfMake.vfs = pdfFonts.pdfMake.vfs
}

type GenerateOfferPdfInput = {
  offer_id: string
}

/**
 * Step to generate a PDF document for an offer
 * Returns PDF buffer that can be saved or emailed
 * No compensation needed (PDF generation is idempotent)
 */
export const generateOfferPdfStep = createStep(
  "generate-offer-pdf",
  async (input: GenerateOfferPdfInput, { container }) => {
    const offerService = container.resolve(OFFER_MODULE)

    // Retrieve offer with line items
    const offer = await offerService.retrieveOffer(input.offer_id, {
      relations: ["line_items"]
    })

    if (!offer) {
      throw new Error(`Offer with id ${input.offer_id} not found`)
    }

    // Define PDF document structure
    const docDefinition = {
      content: [
        // Header
        { text: 'OFFER', style: 'header' },
        { text: offer.offer_number, style: 'subheader' },
        { text: '\n' },

        // Customer Information
        { text: 'Customer Information', style: 'sectionHeader' },
        { text: `Email: ${offer.customer_email}` },
        { text: offer.customer_phone ? `Phone: ${offer.customer_phone}` : '' },
        { text: '\n' },

        // Dates
        { text: `Offer Date: ${new Date(offer.offer_date).toLocaleDateString()}` },
        { text: `Valid Until: ${new Date(offer.valid_until).toLocaleDateString()}` },
        { text: '\n' },

        // Line Items Table
        { text: 'Line Items', style: 'sectionHeader' },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto', 'auto'],
            body: [
              ['Description', 'Quantity', 'Unit Price', 'Discount', 'Total'],
              ...offer.line_items.map((item: any) => [
                item.title + (item.description ? `\n${item.description}` : ''),
                item.quantity.toString(),
                `€${(Number(item.unit_price) / 100).toFixed(2)}`,
                `€${(Number(item.discount_amount) / 100).toFixed(2)}`,
                `€${(Number(item.total_price) / 100).toFixed(2)}`,
              ])
            ]
          }
        },
        { text: '\n' },

        // Totals
        { text: `Subtotal: €${(Number(offer.subtotal) / 100).toFixed(2)}`, alignment: 'right' },
        { text: `Discount: €${(Number(offer.discount_amount) / 100).toFixed(2)}`, alignment: 'right' },
        { text: `Tax: €${(Number(offer.tax_amount) / 100).toFixed(2)}`, alignment: 'right' },
        { text: `Total: €${(Number(offer.total_amount) / 100).toFixed(2)}`, style: 'total', alignment: 'right' },

        // Notes
        offer.notes ? { text: '\n\nNotes:\n' + offer.notes, style: 'notes' } : '',

        // Terms and Conditions
        offer.terms_and_conditions ? { text: '\n\nTerms and Conditions:\n' + offer.terms_and_conditions, style: 'terms' } : '',
      ],
      styles: {
        header: { fontSize: 22, bold: true },
        subheader: { fontSize: 16, bold: true },
        sectionHeader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
        total: { fontSize: 14, bold: true },
        notes: { fontSize: 10, italics: true },
        terms: { fontSize: 8, color: 'gray' }
      }
    }

    // Generate PDF as buffer
    return new Promise((resolve, reject) => {
      const pdfDocGenerator = pdfMake.createPdf(docDefinition)
      pdfDocGenerator.getBuffer((buffer: Buffer) => {
        resolve(new StepResponse({
          buffer,
          filename: `${offer.offer_number}.pdf`
        }))
      })
    })
  }
)
