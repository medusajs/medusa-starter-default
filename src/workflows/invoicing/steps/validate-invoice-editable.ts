import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { INVOICING_MODULE } from "../../../modules/invoicing"

export const validateInvoiceEditableStep = createStep(
  "validate-invoice-editable",
  async (invoice_id: string, { container }) => {
    const invoicingService = container.resolve(INVOICING_MODULE)
    const invoice = await invoicingService.retrieveInvoice(invoice_id)

    if (!invoice) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Invoice with id ${invoice_id} not found`
      )
    }

    if (invoice.status !== 'draft') {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot edit invoice with status "${invoice.status}". Only draft invoices can be edited.`
      )
    }

    return new StepResponse({ invoice })
  }
)
