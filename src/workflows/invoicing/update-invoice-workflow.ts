import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { validateInvoiceEditableStep } from "./steps/validate-invoice-editable"
import { updateInvoiceStep } from "./steps/update-invoice"

export interface UpdateInvoiceInput {
  invoice_id: string
  data: {
    customer_email?: string
    customer_phone?: string
    payment_terms?: string
    notes?: string
    internal_notes?: string
    discount_amount?: number
  }
}

export const updateInvoiceWorkflowId = "update-invoice"

export const updateInvoiceWorkflow = createWorkflow(
  updateInvoiceWorkflowId,
  (input: UpdateInvoiceInput) => {
    // Validate invoice can be edited
    validateInvoiceEditableStep(input.invoice_id)

    // Update invoice
    const invoice = updateInvoiceStep({
      invoice_id: input.invoice_id,
      data: input.data,
    })

    return new WorkflowResponse(invoice)
  }
)
