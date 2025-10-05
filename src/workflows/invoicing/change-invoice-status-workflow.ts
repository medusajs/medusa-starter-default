import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { validateStatusTransitionStep } from "./steps/validate-status-transition"
import { changeInvoiceStatusStep } from "./steps/change-invoice-status"

export interface ChangeInvoiceStatusInput {
  invoice_id: string
  new_status: string
  user_id: string
  reason?: string
}

export const changeInvoiceStatusWorkflowId = "change-invoice-status"

export const changeInvoiceStatusWorkflow = createWorkflow(
  changeInvoiceStatusWorkflowId,
  (input: ChangeInvoiceStatusInput) => {
    // Validate the status transition is allowed
    validateStatusTransitionStep({
      invoice_id: input.invoice_id,
      new_status: input.new_status,
    })

    // Change the invoice status
    const invoice = changeInvoiceStatusStep({
      invoice_id: input.invoice_id,
      new_status: input.new_status,
      user_id: input.user_id,
      reason: input.reason,
    })

    return new WorkflowResponse(invoice)
  }
)
