import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { deleteInvoiceStep } from "./steps/delete-invoice"

export interface DeleteInvoiceInput {
  invoice_id: string
}

export const deleteInvoiceWorkflowId = "delete-invoice"

export const deleteInvoiceWorkflow = createWorkflow(
  deleteInvoiceWorkflowId,
  (input: DeleteInvoiceInput) => {
    // Delete invoice (cascade deletes line items and status history)
    const result = deleteInvoiceStep(input.invoice_id)

    return new WorkflowResponse(result)
  }
)
