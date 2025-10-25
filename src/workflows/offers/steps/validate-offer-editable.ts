import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { OFFER_MODULE } from "../../../modules/offers"

/**
 * Validation step to check if an offer can be edited
 * Throws error if offer status doesn't allow editing (only DRAFT offers can be edited)
 * No compensation needed (validation only)
 */
export const validateOfferEditableStep = createStep(
  "validate-offer-editable",
  async (offer_id: string, { container }) => {
    const offerService = container.resolve(OFFER_MODULE)
    const offer = await offerService.retrieveOffer(offer_id)

    if (!offer) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Offer with id ${offer_id} not found`
      )
    }

    // Only draft offers can be edited
    if (offer.status !== 'draft') {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot edit offer with status "${offer.status}". Only draft offers can be edited.`
      )
    }

    return new StepResponse({ offer })
  }
)
