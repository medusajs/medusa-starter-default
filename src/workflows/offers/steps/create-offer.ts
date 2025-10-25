import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { OFFER_MODULE } from "../../../modules/offers"

type CreateOfferInput = {
  customer_id: string
  customer_email: string
  customer_phone?: string
  offer_date?: Date
  valid_until?: Date
  currency_code?: string
  billing_address: any
  shipping_address?: any
  notes?: string
  terms_and_conditions?: string
  created_by?: string
  metadata?: Record<string, any>
}

/**
 * Step to create a new offer with auto-generated offer number
 * Compensation: Deletes the created offer
 */
export const createOfferStep = createStep(
  "create-offer",
  async (input: CreateOfferInput, { container }) => {
    const offerService = container.resolve(OFFER_MODULE)

    // Create offer with auto-generated number and default dates
    const offer = await offerService.createOfferWithNumber(input)

    return new StepResponse(offer, offer.id)
  },
  async (offerId, { container }) => {
    if (!offerId) return

    const offerService = container.resolve(OFFER_MODULE)
    await offerService.deleteOffers(offerId)
  }
)
