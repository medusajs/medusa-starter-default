import { createWorkflow, WorkflowResponse, createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { validateOfferEditableStep } from "./steps/validate-offer-editable"
import { OFFER_MODULE } from "../../modules/offers"

export type UpdateOfferInput = {
  offer_id: string
  customer_email?: string
  customer_phone?: string
  valid_until?: Date
  billing_address?: any
  shipping_address?: any
  notes?: string
  terms_and_conditions?: string
  metadata?: Record<string, any>
}

/**
 * Step to update offer details
 */
const updateOfferStep = createStep(
  "update-offer",
  async (input: UpdateOfferInput, { container }) => {
    const offerService = container.resolve(OFFER_MODULE)

    // Get old values for compensation
    const oldOffer = await offerService.retrieveOffer(input.offer_id)

    // Update offer
    const updatedOffer = await offerService.updateOffers(
      {
        id: input.offer_id,
        customer_email: input.customer_email,
        customer_phone: input.customer_phone,
        valid_until: input.valid_until,
        billing_address: input.billing_address,
        shipping_address: input.shipping_address,
        notes: input.notes,
        terms_and_conditions: input.terms_and_conditions,
        metadata: input.metadata,
      },
      { id: input.offer_id }
    )

    return new StepResponse(updatedOffer, {
      offer_id: input.offer_id,
      old_values: {
        customer_email: oldOffer.customer_email,
        customer_phone: oldOffer.customer_phone,
        valid_until: oldOffer.valid_until,
        billing_address: oldOffer.billing_address,
        shipping_address: oldOffer.shipping_address,
        notes: oldOffer.notes,
        terms_and_conditions: oldOffer.terms_and_conditions,
        metadata: oldOffer.metadata,
      }
    })
  },
  async (compensationData, { container }) => {
    if (!compensationData) return

    const offerService = container.resolve(OFFER_MODULE)

    // Restore old values
    await offerService.updateOffers(
      {
        id: compensationData.offer_id,
        ...compensationData.old_values,
      },
      { id: compensationData.offer_id }
    )
  }
)

/**
 * Workflow to update offer details
 * Validates offer is editable and updates the offer
 */
export const updateOfferWorkflow = createWorkflow(
  "update-offer",
  (input: UpdateOfferInput) => {
    // Validate offer can be edited (DRAFT status only)
    validateOfferEditableStep(input.offer_id)

    // Update offer
    const offer = updateOfferStep(input)

    return new WorkflowResponse(offer)
  }
)
