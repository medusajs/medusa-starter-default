import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { INVOICING_MODULE } from "../../../modules/invoicing"
import { InvoiceStatus } from "../../../modules/invoicing/models/invoice"

type ValidateInvoicesMergeableInput = {
  invoice_ids: string[]
}

export const validateInvoicesMergeableStep = createStep(
  "validate-invoices-mergeable",
  async ({ invoice_ids }: ValidateInvoicesMergeableInput, { container }) => {
    const invoicingService = container.resolve(INVOICING_MODULE)

    // Validate minimum invoices
    if (!invoice_ids || invoice_ids.length < 2) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "At least 2 invoices are required to merge"
      )
    }

    // Validate maximum invoices (configurable limit)
    const MAX_INVOICES_PER_MERGE = 10
    if (invoice_ids.length > MAX_INVOICES_PER_MERGE) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot merge more than ${MAX_INVOICES_PER_MERGE} invoices at once`
      )
    }

    // Retrieve all invoices
    const invoices = await invoicingService.listInvoices({
      id: invoice_ids,
    }, {
      relations: ["line_items"]
    })

    // Validate all invoices exist
    if (invoices.length !== invoice_ids.length) {
      const foundIds = invoices.map(inv => inv.id)
      const missingIds = invoice_ids.filter(id => !foundIds.includes(id))
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Invoices not found: ${missingIds.join(", ")}`
      )
    }

    // Validate all invoices belong to the same customer
    const customerIds = [...new Set(invoices.map(inv => inv.customer_id))]
    if (customerIds.length > 1) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "All invoices must belong to the same customer"
      )
    }

    // Validate all invoices are in draft status
    const nonDraftInvoices = invoices.filter(
      inv => inv.status !== InvoiceStatus.DRAFT
    )
    if (nonDraftInvoices.length > 0) {
      const invoiceNumbers = nonDraftInvoices.map(inv => inv.invoice_number).join(", ")
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Only draft invoices can be merged. Non-draft invoices: ${invoiceNumbers}`
      )
    }

    // Validate all invoices have the same currency
    const currencies = [...new Set(invoices.map(inv => inv.currency_code))]
    if (currencies.length > 1) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `All invoices must have the same currency. Found: ${currencies.join(", ")}`
      )
    }

    // Validate no invoices have associated payments
    // Check if any invoice has paid_date set (indicating payment)
    const invoicesWithPayments = invoices.filter(inv => inv.paid_date !== null)
    if (invoicesWithPayments.length > 0) {
      const invoiceNumbers = invoicesWithPayments.map(inv => inv.invoice_number).join(", ")
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot merge invoices with payments: ${invoiceNumbers}`
      )
    }

    // Sort invoices by invoice_date for consistent ordering
    const sortedInvoices = invoices.sort((a, b) => 
      new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime()
    )

    return new StepResponse({
      invoices: sortedInvoices,
      customer_id: customerIds[0],
      currency_code: currencies[0],
    })
  }
)

