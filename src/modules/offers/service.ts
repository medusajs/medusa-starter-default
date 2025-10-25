import { MedusaService, MathBN } from "@medusajs/framework/utils"
import Offer, { OfferStatus } from "./models/offer"
import OfferLineItem, { OfferLineItemType } from "./models/offer-line-item"
import OfferStatusHistory from "./models/offer-status-history"
import PdfPrinter from "pdfmake"
import axios from "axios"

// PDF fonts configuration for pdfmake
const fonts = {
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
}

// Initialize PDF printer with fonts
const printer = new PdfPrinter(fonts)

// TypeScript type definitions
type CreateOfferInput = {
  customer_id: string
  customer_email: string
  customer_phone?: string
  offer_date?: Date
  valid_until?: Date
  currency_code?: string
  billing_address: any
  shipping_address?: any
  notes?: string
  terms_and_conditions?: string
  created_by?: string
  metadata?: Record<string, any>
}

type CreateOfferLineItemInput = {
  offer_id: string
  item_type?: "product" | "custom" | "discount"
  product_id?: string
  variant_id?: string
  title: string
  description?: string
  sku?: string
  quantity: number
  unit_price: number
  discount_amount?: number
  tax_rate?: number
  notes?: string
  metadata?: Record<string, any>
}

class OfferService extends MedusaService({
  Offer,
  OfferLineItem,
  OfferStatusHistory,
}) {

  /**
   * Generate a unique offer number in format: OFF-YYYY-MM-XXX
   * Sequential numbering per month
   */
  async generateOfferNumber(): Promise<string> {
    const currentDate = new Date()
    const year = currentDate.getFullYear()
    const month = String(currentDate.getMonth() + 1).padStart(2, '0')

    // Get count of offers for this month to generate sequential number
    const existingOffers = await this.listOffers({
      offer_number: { $like: `OFF-${year}-${month}-%` }
    })

    const sequenceNumber = String(existingOffers.length + 1).padStart(3, '0')
    return `OFF-${year}-${month}-${sequenceNumber}`
  }

  /**
   * Create a new offer with auto-generated offer number
   * Sets default dates and initializes with DRAFT status
   */
  async createOfferWithNumber(data: CreateOfferInput) {
    const offerNumber = await this.generateOfferNumber()

    // Set default offer date to today
    const offerDate = data.offer_date || new Date()

    // Set default valid_until to 30 days from offer date
    const validUntil = data.valid_until || new Date(offerDate.getTime() + (30 * 24 * 60 * 60 * 1000))

    // Create the offer with initial values
    const offer = await this.createOffers({
      ...data,
      offer_number: offerNumber,
      offer_date: offerDate,
      valid_until: validUntil,
      status: OfferStatus.DRAFT,
      subtotal: 0,
      tax_amount: 0,
      discount_amount: 0,
      total_amount: 0,
    })

    // Create initial status history entry
    await this.createOfferStatusHistories({
      offer_id: offer.id,
      from_status: null,
      to_status: offer.status,
      changed_by: data.created_by || "system",
      changed_at: new Date(),
      reason: "Offer created",
    })

    return offer
  }

  /**
   * Add a line item to an offer
   * Calculates pricing with MathBN and updates offer totals
   */
  async addLineItemToOffer(data: CreateOfferLineItemInput) {
    // Calculate total price using MathBN for BigNumber arithmetic
    const subtotal = MathBN.mult(data.quantity, data.unit_price)
    const totalPrice = MathBN.sub(subtotal, data.discount_amount || 0)
    const taxAmount = MathBN.mult(totalPrice, data.tax_rate || 0)

    // Create the line item
    const lineItem = await this.createOfferLineItems({
      ...data,
      total_price: totalPrice.toNumber(),
      tax_amount: taxAmount.toNumber(),
      discount_amount: data.discount_amount || 0,
      tax_rate: data.tax_rate || 0,
    })

    // Update offer totals after adding line item
    await this.recalculateOfferTotals(data.offer_id)

    return lineItem
  }

  /**
   * Recalculate all totals for an offer based on its line items
   * Uses MathBN for all BigNumber calculations
   */
  async recalculateOfferTotals(offerId: string) {
    if (!offerId) {
      throw new Error('Offer ID is required for recalculating totals')
    }

    const offer = await this.retrieveOffer(offerId)
    const lineItems = await this.listOfferLineItems({ offer_id: offerId })

    // Calculate subtotal from unit_price * quantity (before discounts)
    // Use MathBN.sum for proper BigNumber handling
    const subtotal = MathBN.sum(
      ...lineItems.map(item => MathBN.mult(item.unit_price || 0, item.quantity || 0))
    )

    // Sum all discount amounts
    const discountAmount = MathBN.sum(
      ...lineItems.map(item => item.discount_amount || 0)
    )

    // Sum all tax amounts
    const taxAmount = MathBN.sum(
      ...lineItems.map(item => item.tax_amount || 0)
    )

    // Total = subtotal - discount + tax
    const subtotalAfterDiscount = MathBN.sub(subtotal, discountAmount)
    const totalAmount = MathBN.add(subtotalAfterDiscount, taxAmount)

    // Update the offer with calculated totals
    return await this.updateOffers({
      id: offerId,
      subtotal: subtotal.toNumber(),
      tax_amount: taxAmount.toNumber(),
      discount_amount: discountAmount.toNumber(),
      total_amount: totalAmount.toNumber(),
    }, { id: offerId })
  }

  /**
   * Change the status of an offer
   * Updates appropriate date fields and creates status history entry
   * Validates status transitions
   */
  async changeOfferStatus(offerId: string, newStatus: string, changedBy: string, reason?: string) {
    const offer = await this.retrieveOffer(offerId)
    const oldStatus = offer.status

    // Validate status transitions
    this.validateStatusTransition(oldStatus, newStatus)

    // Prepare update data with status-specific date fields
    const updateData: any = {
      id: offerId,
      status: newStatus as any,
    }

    // Set appropriate date fields based on new status
    if (newStatus === OfferStatus.SENT) {
      updateData.sent_date = new Date()
    } else if (newStatus === OfferStatus.ACCEPTED) {
      updateData.accepted_date = new Date()
    } else if (newStatus === OfferStatus.REJECTED) {
      updateData.rejected_date = new Date()
    } else if (newStatus === OfferStatus.CONVERTED) {
      updateData.converted_date = new Date()
    }

    // Update offer status
    const updatedOffer = await this.updateOffers(updateData, { id: offerId })

    // Create status history entry
    await this.createOfferStatusHistories({
      offer_id: offerId,
      from_status: oldStatus,
      to_status: newStatus,
      changed_by: changedBy,
      changed_at: new Date(),
      reason: reason || `Status changed to ${newStatus}`,
    })

    return updatedOffer
  }

  /**
   * Validate status transitions
   * Prevents invalid status changes (e.g., DRAFT -> ACCEPTED)
   */
  private validateStatusTransition(fromStatus: string, toStatus: string) {
    const validTransitions: Record<string, string[]> = {
      [OfferStatus.DRAFT]: [OfferStatus.SENT, OfferStatus.EXPIRED],
      [OfferStatus.SENT]: [OfferStatus.ACCEPTED, OfferStatus.REJECTED, OfferStatus.EXPIRED],
      [OfferStatus.ACCEPTED]: [OfferStatus.CONVERTED],
      [OfferStatus.REJECTED]: [],
      [OfferStatus.EXPIRED]: [],
      [OfferStatus.CONVERTED]: [],
    }

    const allowedTransitions = validTransitions[fromStatus] || []

    if (!allowedTransitions.includes(toStatus)) {
      throw new Error(
        `Invalid status transition: Cannot change from ${fromStatus} to ${toStatus}`
      )
    }
  }

  /**
   * Get analytics data for offers
   * Includes total count, amount, status breakdown, and conversion rate
   */
  async getOfferAnalytics(filters: any = {}) {
    const offers = await this.listOffers(filters)

    // Calculate basic metrics
    const analytics = {
      totalOffers: offers.length,
      totalAmount: offers.reduce((sum, offer) => sum + Number(offer.total_amount), 0),
      averageAmount: 0,
      statusBreakdown: {} as Record<string, number>,
      conversionRate: 0,
    }

    // Calculate average amount
    analytics.averageAmount = analytics.totalAmount / (analytics.totalOffers || 1)

    // Status breakdown
    offers.forEach(offer => {
      analytics.statusBreakdown[offer.status] = (analytics.statusBreakdown[offer.status] || 0) + 1
    })

    // Calculate conversion rate (converted / (accepted + converted))
    const convertedCount = analytics.statusBreakdown[OfferStatus.CONVERTED] || 0
    const acceptedCount = analytics.statusBreakdown[OfferStatus.ACCEPTED] || 0
    const totalEligibleForConversion = convertedCount + acceptedCount

    if (totalEligibleForConversion > 0) {
      analytics.conversionRate = (convertedCount / totalEligibleForConversion) * 100
    }

    return analytics
  }

  /**
   * Get all expired offers
   * Returns offers where valid_until < today and status = SENT
   */
  async getExpiredOffers() {
    const today = new Date()
    return await this.listOffers({
      status: OfferStatus.SENT,
      valid_until: { $lt: today },
    })
  }

  /**
   * Get offer history for a specific customer
   * Returns all offers with line items and status history
   */
  async getCustomerOfferHistory(customerId: string) {
    return await this.listOffers(
      { customer_id: customerId },
      {
        order: { created_at: "DESC" },
        relations: ["line_items", "status_history"]
      }
    )
  }

  // ============================================================================
  // PDF Generation Methods (TEM-279)
  // ============================================================================

  /**
   * Format a numeric amount as currency string
   * @param amount - The numeric amount to format
   * @param currency - Currency code (e.g., "USD", "EUR")
   * @returns Formatted currency string
   */
  private async formatAmount(amount: number, currency: string): Promise<string> {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  /**
   * Convert an image URL to base64 data URI
   * Used for embedding images (e.g., company logo) in PDF
   * @param url - The image URL to convert
   * @returns Base64 data URI string
   */
  private async imageUrlToBase64(url: string): Promise<string> {
    const response = await axios.get(url, { responseType: "arraybuffer" })
    const base64 = Buffer.from(response.data).toString("base64")
    const mimeType = response.headers["content-type"] || "image/png"
    return `data:${mimeType};base64,${base64}`
  }

  /**
   * Generate PDF document definition for an offer
   * Creates a complete pdfmake document definition with all offer details
   * @param params - Object containing offer, customer, and line items
   * @returns pdfmake document definition object
   */
  async getOfferPdfContent(params: {
    offer: any
    customer: any
    lineItems: any[]
  }): Promise<any> {
    const { offer, customer, lineItems } = params

    // Company logo (if available) - convert to base64 for embedding
    const logo = offer.company_logo
      ? await this.imageUrlToBase64(offer.company_logo)
      : null

    // Build line items table with header and data rows
    // Process line items with async formatAmount calls
    const lineItemRows = await Promise.all(
      lineItems.map(async (item) => [
        {
          text: [
            { text: item.title, bold: true },
            item.description ? `\n${item.description}` : "",
            item.sku ? `\nSKU: ${item.sku}` : "",
          ]
        },
        { text: item.quantity.toString(), alignment: "right" },
        {
          text: await this.formatAmount(item.unit_price, offer.currency_code),
          alignment: "right"
        },
        {
          text: `${(item.tax_rate * 100).toFixed(2)}%`,
          alignment: "right"
        },
        {
          text: await this.formatAmount(item.total_price + item.tax_amount, offer.currency_code),
          alignment: "right"
        },
      ])
    )

    const tableBody = [
      // Header row
      [
        { text: "Item", style: "tableHeader" },
        { text: "Quantity", style: "tableHeader", alignment: "right" },
        { text: "Unit Price", style: "tableHeader", alignment: "right" },
        { text: "Tax", style: "tableHeader", alignment: "right" },
        { text: "Total", style: "tableHeader", alignment: "right" },
      ],
      // Data rows
      ...lineItemRows
    ]

    // Document definition following pdfmake structure
    return {
      content: [
        // Header section with logo and offer number
        {
          columns: [
            logo ? { image: logo, width: 150 } : {},
            {
              stack: [
                { text: "OFFER", style: "header" },
                { text: offer.offer_number, style: "subheader" },
              ],
              alignment: "right"
            }
          ],
          margin: [0, 0, 0, 30]
        },

        // Dates and validity section
        {
          columns: [
            {
              stack: [
                { text: "Offer Date", style: "label" },
                { text: new Date(offer.offer_date).toLocaleDateString() },
                { text: "Valid Until", style: "label", margin: [0, 10, 0, 0] },
                { text: new Date(offer.valid_until).toLocaleDateString() },
              ]
            },
            {
              stack: [
                { text: "Customer", style: "label" },
                { text: customer.first_name + " " + customer.last_name, bold: true },
                { text: customer.email },
                customer.phone ? { text: customer.phone } : {},
              ],
              alignment: "right"
            }
          ],
          margin: [0, 0, 0, 30]
        },

        // Billing Address section
        {
          text: "Billing Address",
          style: "label",
          margin: [0, 0, 0, 5]
        },
        {
          text: [
            offer.billing_address.address_1 || "",
            offer.billing_address.address_2 ? `\n${offer.billing_address.address_2}` : "",
            `\n${offer.billing_address.postal_code || ""} ${offer.billing_address.city || ""}`,
            offer.billing_address.country_code ? `\n${offer.billing_address.country_code}` : "",
          ],
          margin: [0, 0, 0, 30]
        },

        // Line Items Table
        {
          table: {
            headerRows: 1,
            widths: ["*", "auto", "auto", "auto", "auto"],
            body: tableBody
          },
          layout: "lightHorizontalLines",
          margin: [0, 0, 0, 30]
        },

        // Totals section (right-aligned)
        {
          columns: [
            {},
            {
              stack: [
                {
                  columns: [
                    { text: "Subtotal:", alignment: "right", width: 100 },
                    {
                      text: await this.formatAmount(offer.subtotal, offer.currency_code),
                      alignment: "right",
                      width: 100
                    }
                  ]
                },
                // Only show discount if there is one
                offer.discount_amount > 0 ? {
                  columns: [
                    { text: "Discount:", alignment: "right", width: 100 },
                    {
                      text: await this.formatAmount(offer.discount_amount, offer.currency_code),
                      alignment: "right",
                      width: 100
                    }
                  ],
                  margin: [0, 5, 0, 0]
                } : {},
                {
                  columns: [
                    { text: "Tax:", alignment: "right", width: 100 },
                    {
                      text: await this.formatAmount(offer.tax_amount, offer.currency_code),
                      alignment: "right",
                      width: 100
                    }
                  ],
                  margin: [0, 5, 0, 0]
                },
                {
                  columns: [
                    { text: "Total:", alignment: "right", width: 100, bold: true },
                    {
                      text: await this.formatAmount(offer.total_amount, offer.currency_code),
                      alignment: "right",
                      width: 100,
                      bold: true,
                      fontSize: 14
                    }
                  ],
                  margin: [0, 10, 0, 0]
                },
              ],
              width: 200
            }
          ]
        },

        // Notes section (if available)
        offer.notes ? {
          stack: [
            { text: "Notes", style: "label", margin: [0, 30, 0, 5] },
            { text: offer.notes }
          ]
        } : {},

        // Terms and Conditions section (if available)
        offer.terms_and_conditions ? {
          stack: [
            { text: "Terms and Conditions", style: "label", margin: [0, 20, 0, 5] },
            { text: offer.terms_and_conditions, fontSize: 9 }
          ]
        } : {},
      ],

      // Styles definition for the document
      styles: {
        header: {
          fontSize: 22,
          bold: true,
        },
        subheader: {
          fontSize: 16,
        },
        label: {
          fontSize: 10,
          bold: true,
          color: "#666",
        },
        tableHeader: {
          bold: true,
          fontSize: 11,
          color: "white",
          fillColor: "#2c3e50",
        },
      },

      // Default style for all text
      defaultStyle: {
        font: "Helvetica",
        fontSize: 10,
      }
    }
  }

  /**
   * Generate PDF document as a Buffer
   * Takes offer data and creates a PDF document using pdfmake
   * @param params - Object containing offer, customer, and line items
   * @returns Promise that resolves to PDF Buffer
   */
  async generatePdf(params: {
    offer: any
    customer: any
    lineItems: any[]
  }): Promise<Buffer> {
    // Get the document definition
    const docDefinition = await this.getOfferPdfContent(params)

    // Create PDF and return as Buffer using Promise-based approach
    return new Promise((resolve, reject) => {
      const pdfDoc = printer.createPdfKitDocument(docDefinition)
      const chunks: Buffer[] = []

      // Collect data chunks as they're generated
      pdfDoc.on("data", (chunk) => chunks.push(chunk))

      // Resolve with complete buffer when PDF generation is done
      pdfDoc.on("end", () => resolve(Buffer.concat(chunks)))

      // Reject promise if there's an error during generation
      pdfDoc.on("error", reject)

      // Finalize the PDF document
      pdfDoc.end()
    })
  }
}

export default OfferService
