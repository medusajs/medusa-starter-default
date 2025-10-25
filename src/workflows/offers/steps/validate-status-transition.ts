import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { OFFER_MODULE } from "../../../modules/offers"
import { OfferStatus } from "../../../modules/offers/models/offer"

type ValidateStatusTransitionInput = {
  offer_id: string
  new_status: string
}

/**
 * Validation step to check if a status change is allowed
 * Validates state machine transitions
 * No compensation needed (validation only)
 */
export const validateStatusTransitionStep = createStep(
  "validate-status-transition",
  async (input: ValidateStatusTransitionInput, { container }) => {
    const offerService = container.resolve(OFFER_MODULE)
    const offer = await offerService.retrieveOffer(input.offer_id)

    if (!offer) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Offer with id ${input.offer_id} not found`
      )
    }

    // Define valid status transitions
    const validTransitions: Record<string, string[]> = {
      [OfferStatus.DRAFT]: [OfferStatus.SENT, OfferStatus.EXPIRED],
      [OfferStatus.SENT]: [OfferStatus.ACCEPTED, OfferStatus.REJECTED, OfferStatus.EXPIRED],
      [OfferStatus.ACCEPTED]: [OfferStatus.CONVERTED],
      [OfferStatus.REJECTED]: [],
      [OfferStatus.EXPIRED]: [],
      [OfferStatus.CONVERTED]: [],
    }

    const allowedTransitions = validTransitions[offer.status] || []

    if (!allowedTransitions.includes(input.new_status)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid status transition: Cannot change from "${offer.status}" to "${input.new_status}". ` +
        `Allowed transitions: ${allowedTransitions.length > 0 ? allowedTransitions.join(', ') : 'none'}`
      )
    }

    return new StepResponse({
      valid: true,
      from_status: offer.status,
      to_status: input.new_status,
    })
  }
)
