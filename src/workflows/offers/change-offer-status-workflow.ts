import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { validateStatusTransitionStep } from "./steps/validate-status-transition"
import { changeOfferStatusStep } from "./steps/change-offer-status"

export type ChangeOfferStatusInput = {
  offer_id: string
  new_status: string
  changed_by: string
  reason?: string
}

/**
 * Workflow to change the status of an offer
 * Validates status transition, changes status, and creates history entry
 */
export const changeOfferStatusWorkflow = createWorkflow(
  "change-offer-status",
  (input: ChangeOfferStatusInput) => {
    // Validate status transition is allowed
    validateStatusTransitionStep({
      offer_id: input.offer_id,
      new_status: input.new_status,
    })

    // Change offer status
    const offer = changeOfferStatusStep(input)

    return new WorkflowResponse(offer)
  }
)
