import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { validateOfferEditableStep } from "./steps/validate-offer-editable"
import { updateLineItemStep } from "./steps/update-line-item"
import { recalculateOfferTotalsStep } from "./steps/recalculate-offer-totals"

export type UpdateLineItemInput = {
  line_item_id: string
  offer_id: string
  title?: string
  description?: string
  quantity?: number
  unit_price?: number
  discount_amount?: number
  tax_rate?: number
  notes?: string
}

/**
 * Workflow to update an existing line item in an offer
 * Validates offer is editable, updates line item, and recalculates totals
 */
export const updateLineItemWorkflow = createWorkflow(
  "update-line-item",
  (input: UpdateLineItemInput) => {
    // Validate offer can be edited (DRAFT status only)
    validateOfferEditableStep(input.offer_id)

    // Update line item
    const lineItem = updateLineItemStep(input)

    // Recalculate offer totals
    recalculateOfferTotalsStep({ offer_id: input.offer_id })

    return new WorkflowResponse(lineItem)
  }
)
