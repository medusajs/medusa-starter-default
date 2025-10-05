import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { validateInvoiceEditableStep } from "./steps/validate-invoice-editable"
import { addLineItemStep } from "./steps/add-line-item"
import { recalculateInvoiceTotalsStep } from "./steps/recalculate-invoice-totals"

export interface AddLineItemInput {
  invoice_id: string
  item_type?: "product" | "service" | "labor" | "shipping" | "discount"
  product_id?: string
  variant_id?: string
  title: string
  description?: string
  sku?: string
  quantity: number
  unit_price: number
  discount_amount?: number
  tax_rate?: number
  hours_worked?: number
  hourly_rate?: number
  notes?: string
}

export const addLineItemWorkflowId = "add-line-item-to-invoice"

export const addLineItemWorkflow = createWorkflow(
  addLineItemWorkflowId,
  (input: AddLineItemInput) => {
    // Validate invoice can be edited
    validateInvoiceEditableStep(input.invoice_id)

    // Add line item
    const lineItem = addLineItemStep(input)

    // Recalculate totals
    recalculateInvoiceTotalsStep(input.invoice_id)

    return new WorkflowResponse(lineItem)
  }
)
