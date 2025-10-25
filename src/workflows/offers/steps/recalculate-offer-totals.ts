import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { OFFER_MODULE } from "../../../modules/offers"

type RecalculateOfferTotalsInput = {
  offer_id: string
}

/**
 * Step to recalculate all totals for an offer based on its line items
 * Uses MathBN for all BigNumber calculations
 * Compensation: Restores the previous totals
 */
export const recalculateOfferTotalsStep = createStep(
  "recalculate-offer-totals",
  async (input: RecalculateOfferTotalsInput, { container }) => {
    const offerService = container.resolve(OFFER_MODULE)

    // Get current totals for compensation
    const oldOffer = await offerService.retrieveOffer(input.offer_id)
    const oldTotals = {
      subtotal: oldOffer.subtotal,
      tax_amount: oldOffer.tax_amount,
      discount_amount: oldOffer.discount_amount,
      total_amount: oldOffer.total_amount,
    }

    // Recalculate totals
    const updatedOffer = await offerService.recalculateOfferTotals(input.offer_id)

    return new StepResponse(updatedOffer, {
      offer_id: input.offer_id,
      old_totals: oldTotals,
    })
  },
  async (compensationData, { container }) => {
    if (!compensationData) return

    const offerService = container.resolve(OFFER_MODULE)

    // Restore previous totals
    await offerService.updateOffers(
      {
        id: compensationData.offer_id,
        ...compensationData.old_totals,
      },
      { id: compensationData.offer_id }
    )
  }
)
