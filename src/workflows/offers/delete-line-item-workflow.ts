import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { validateOfferEditableStep } from "./steps/validate-offer-editable"
import { deleteLineItemStep } from "./steps/delete-line-item"
import { recalculateOfferTotalsStep } from "./steps/recalculate-offer-totals"

export type DeleteLineItemInput = {
  line_item_id: string
  offer_id: string
}

/**
 * Workflow to delete a line item from an offer
 * Validates offer is editable, deletes line item, and recalculates totals
 */
export const deleteLineItemWorkflow = createWorkflow(
  "delete-line-item",
  (input: DeleteLineItemInput) => {
    // Validate offer can be edited (DRAFT status only)
    validateOfferEditableStep(input.offer_id)

    // Delete line item
    const result = deleteLineItemStep(input)

    // Recalculate offer totals
    recalculateOfferTotalsStep({ offer_id: input.offer_id })

    return new WorkflowResponse(result)
  }
)
