import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { INVOICING_MODULE } from "../../../modules/invoicing"

type ChangeInvoiceStatusInput = {
  invoice_id: string
  new_status: string
  changed_by: string
  reason?: string
}

export const changeInvoiceStatusStep = createStep(
  "change-invoice-status",
  async (input: ChangeInvoiceStatusInput, { container }) => {
    const invoicingService = container.resolve(INVOICING_MODULE)

    // Store old status for compensation
    const oldInvoice = await invoicingService.retrieveInvoice(input.invoice_id)
    const oldStatus = oldInvoice.status

    const invoice = await invoicingService.changeInvoiceStatus(
      input.invoice_id,
      input.new_status,
      input.changed_by,
      input.reason
    )

    return new StepResponse(invoice, {
      invoice_id: input.invoice_id,
      old_status: oldStatus
    })
  },
  async (compensationData, { container }) => {
    if (!compensationData) return

    const invoicingService = container.resolve(INVOICING_MODULE)

    await invoicingService.changeInvoiceStatus(
      compensationData.invoice_id,
      compensationData.old_status,
      'system',
      'Workflow compensation - reverting status'
    )
  }
)
