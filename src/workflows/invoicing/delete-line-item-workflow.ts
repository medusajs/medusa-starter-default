import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { validateInvoiceEditableStep } from "./steps/validate-invoice-editable"
import { deleteLineItemStep } from "./steps/delete-line-item"
import { recalculateInvoiceTotalsStep } from "./steps/recalculate-invoice-totals"

export interface DeleteLineItemInput {
  invoice_id: string
  line_item_id: string
}

export const deleteLineItemWorkflowId = "delete-invoice-line-item"

export const deleteLineItemWorkflow = createWorkflow(
  deleteLineItemWorkflowId,
  (input: DeleteLineItemInput) => {
    // Validate invoice can be edited
    validateInvoiceEditableStep(input.invoice_id)

    // Delete line item
    deleteLineItemStep(input.line_item_id)

    // Recalculate totals
    recalculateInvoiceTotalsStep(input.invoice_id)

    return new WorkflowResponse({ success: true })
  }
)
