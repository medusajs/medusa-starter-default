import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { INVOICING_MODULE } from "../../../modules/invoicing"

interface UpdateInvoiceInput {
  invoice_id: string
  data: Record<string, any>
}

export const updateInvoiceStep = createStep(
  "update-invoice",
  async (input: UpdateInvoiceInput, { container }) => {
    const invoicingService = container.resolve(INVOICING_MODULE)

    const oldInvoice = await invoicingService.retrieveInvoice(input.invoice_id)

    const invoice = await invoicingService.updateInvoices(
      input.data,
      { id: input.invoice_id }
    )

    return new StepResponse(invoice, {
      invoice_id: input.invoice_id,
      old_data: oldInvoice,
    })
  },
  async (compensationData, { container }) => {
    if (!compensationData) return

    const invoicingService = container.resolve(INVOICING_MODULE)
    await invoicingService.updateInvoices(
      compensationData.old_data,
      { id: compensationData.invoice_id }
    )
  }
)
