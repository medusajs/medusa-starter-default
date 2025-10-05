import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { validateInvoiceEditableStep } from "./steps/validate-invoice-editable"
import { updateLineItemStep } from "./steps/update-line-item"
import { recalculateInvoiceTotalsStep } from "./steps/recalculate-invoice-totals"

export interface UpdateLineItemInput {
  invoice_id: string
  line_item_id: string
  item_type?: "product" | "service" | "labor" | "shipping" | "discount"
  title?: string
  description?: string
  sku?: string
  quantity?: number
  unit_price?: number
  discount_amount?: number
  tax_rate?: number
  hours_worked?: number
  hourly_rate?: number
  notes?: string
}

export const updateLineItemWorkflowId = "update-invoice-line-item"

export const updateLineItemWorkflow = createWorkflow(
  updateLineItemWorkflowId,
  (input: UpdateLineItemInput) => {
    // Validate invoice can be edited
    validateInvoiceEditableStep(input.invoice_id)

    // Update line item
    const lineItem = updateLineItemStep(input)

    // Recalculate totals
    recalculateInvoiceTotalsStep(input.invoice_id)

    return new WorkflowResponse(lineItem)
  }
)
