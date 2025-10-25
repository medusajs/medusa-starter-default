import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { OFFER_MODULE } from "../../../modules/offers"

type ChangeOfferStatusInput = {
  offer_id: string
  new_status: string
  changed_by: string
  reason?: string
}

/**
 * Step to change the status of an offer
 * Updates appropriate date fields and creates status history entry
 * Validates status transitions
 * Compensation: Reverts to the previous status
 */
export const changeOfferStatusStep = createStep(
  "change-offer-status",
  async (input: ChangeOfferStatusInput, { container }) => {
    const offerService = container.resolve(OFFER_MODULE)

    // Store old status for compensation
    const oldOffer = await offerService.retrieveOffer(input.offer_id)
    const oldStatus = oldOffer.status

    // Change status (this will validate the transition)
    const offer = await offerService.changeOfferStatus(
      input.offer_id,
      input.new_status,
      input.changed_by,
      input.reason
    )

    return new StepResponse(offer, {
      offer_id: input.offer_id,
      old_status: oldStatus,
    })
  },
  async (compensationData, { container }) => {
    if (!compensationData) return

    const offerService = container.resolve(OFFER_MODULE)

    // Revert to old status
    await offerService.changeOfferStatus(
      compensationData.offer_id,
      compensationData.old_status,
      'system',
      'Workflow compensation - reverting status'
    )
  }
)
