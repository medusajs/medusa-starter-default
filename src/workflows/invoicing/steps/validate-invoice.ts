import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { INVOICING_MODULE } from "../../../modules/invoicing"

export const validateInvoiceStep = createStep(
  "validate-invoice",
  async (input: { invoice_id: string }, { container }) => {
    const invoicingService = container.resolve(INVOICING_MODULE)

    const invoice = await invoicingService.retrieveInvoice(input.invoice_id)

    if (!invoice) {
      throw new Error(`Invoice ${input.invoice_id} not found`)
    }

    if (invoice.status !== 'draft') {
      throw new Error(`Invoice must be in draft status to send. Current status: ${invoice.status}`)
    }

    const lineItems = await invoicingService.listInvoiceLineItems({
      invoice_id: input.invoice_id
    })

    if (!lineItems || lineItems.length === 0) {
      throw new Error('Invoice must have at least one line item')
    }

    if (!invoice.customer_email) {
      throw new Error('Invoice must have a customer email')
    }

    return new StepResponse({ valid: true, invoice })
  }
)
