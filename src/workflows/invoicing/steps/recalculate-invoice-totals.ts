import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { INVOICING_MODULE } from "../../../modules/invoicing"

export const recalculateInvoiceTotalsStep = createStep(
  "recalculate-invoice-totals",
  async (invoice_id: string, { container }) => {
    const invoicingService = container.resolve(INVOICING_MODULE)

    const lineItems = await invoicingService.listInvoiceLineItems({
      invoice_id,
    })

    const subtotal = lineItems.reduce((sum, item) => sum + item.total_price, 0)
    const taxAmount = lineItems.reduce((sum, item) => sum + item.tax_amount, 0)
    const invoice = await invoicingService.retrieveInvoice(invoice_id)

    const totalAmount = subtotal + taxAmount - (invoice.discount_amount || 0)

    const updatedInvoice = await invoicingService.updateInvoices(
      {
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
      },
      { id: invoice_id }
    )

    return new StepResponse(updatedInvoice)
  }
)
