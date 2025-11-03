import {
  createStep,
  StepResponse
} from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys,
  Modules
} from "@medusajs/framework/utils"
import { INVOICING_MODULE } from "../../../modules/invoicing"
import { RENTALS_MODULE } from "../../../modules/rentals"

/**
 * TEM-206: Convert Rental to Invoice Step
 *
 * Creates an invoice from a rental order with:
 * - Customer information from linked customer module
 * - Line item with rental hours and cost details
 * - Invoice-Rental module link
 * - Compensation logic for workflow failures
 */

type ConvertRentalToInvoiceInput = {
  rental_id: string
  invoice_type?: "service_work" | "mixed"
  due_date?: Date
  payment_terms?: string
  notes?: string
  created_by?: string
}

export const convertRentalToInvoiceStep = createStep(
  "convert-rental-to-invoice",
  async (input: ConvertRentalToInvoiceInput, { container }) => {
    const invoicingService = container.resolve(INVOICING_MODULE)
    const rentalsService = container.resolve(RENTALS_MODULE)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    // TEM-206: Fetch rental with linked customer and machine data
    const rental = await rentalsService.retrieveRental(input.rental_id)

    if (!rental) {
      throw new Error(`Rental ${input.rental_id} not found`)
    }

    // TEM-206: Get customer details via Remote Query
    const { data: [customer] } = await query.graph({
      entity: "customer",
      fields: [
        "id",
        "first_name",
        "last_name",
        "email",
        "phone",
        "addresses.*",
      ],
      filters: {
        id: rental.customer_id!,
      },
    })

    if (!customer) {
      throw new Error(`Customer ${rental.customer_id} not found`)
    }

    // TEM-206: Use primary address or create a basic one
    const billingAddress = customer.addresses?.[0] || {
      first_name: customer.first_name,
      last_name: customer.last_name,
      company: "",
      address_1: "",
      city: "",
      postal_code: "",
      country_code: "BE", // Belgium default
    }

    // TEM-206: Validate required fields
    if (!rental.customer_id) {
      throw new Error("Rental must have a customer_id to create invoice")
    }

    // TEM-206: Create the invoice with generated invoice number
    const invoice = await invoicingService.createInvoiceWithNumber({
      customer_id: rental.customer_id,
      rental_id: rental.id,
      invoice_type: input.invoice_type || "service_work",
      due_date: input.due_date,
      currency_code: "EUR",
      billing_address: billingAddress,
      customer_email: customer.email || '',
      customer_phone: customer.phone || undefined,
      notes: input.notes || `Rental: ${rental.rental_number}`,
      payment_terms: input.payment_terms,
      created_by: input.created_by,
    })

    // TEM-206: Create line item for rental with hours and cost details
    // Description includes hours used and hourly rate for transparency
    if (rental.total_hours_used > 0 && rental.hourly_rate > 0) {
      await invoicingService.addLineItemToInvoice({
        invoice_id: invoice.id,
        item_type: "rental",
        title: `Machine Rental - ${rental.rental_number}`,
        description: `${rental.description || "Machine rental"} (${rental.total_hours_used} hours @ €${(rental.hourly_rate / 100).toFixed(2)}/hr)`,
        quantity: rental.total_hours_used,
        unit_price: rental.hourly_rate,
        tax_rate: 0.21, // Belgium VAT rate
      })
    }

    // TEM-206: Recalculate totals to ensure accuracy
    await invoicingService.recalculateInvoiceTotals(invoice.id)

    // TEM-206: Create the module link between invoice and customer
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)
    await remoteLink.create({
      [INVOICING_MODULE]: {
        invoice_id: invoice.id,
      },
      [Modules.CUSTOMER]: {
        customer_id: rental.customer_id,
      },
    })

    return new StepResponse(invoice, invoice.id)
  },
  async (invoiceId: string, { container }) => {
    // TEM-206: Compensation - delete the created invoice if workflow fails
    if (!invoiceId) return

    const invoicingService = container.resolve(INVOICING_MODULE)
    await invoicingService.deleteInvoices([invoiceId])
  }
)
