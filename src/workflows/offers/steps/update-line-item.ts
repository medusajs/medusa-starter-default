import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { OFFER_MODULE } from "../../../modules/offers"

type UpdateLineItemInput = {
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
 * Step to update an existing line item in an offer
 * Compensation: Restores the previous line item values
 */
export const updateLineItemStep = createStep(
  "update-line-item",
  async (input: UpdateLineItemInput, { container }) => {
    const offerService = container.resolve(OFFER_MODULE)

    // Retrieve old line item for compensation
    const oldLineItem = await offerService.retrieveOfferLineItem(input.line_item_id)

    // Update the line item
    const updatedLineItem = await offerService.updateOfferLineItems(
      {
        id: input.line_item_id,
        ...input,
      },
      { id: input.line_item_id }
    )

    // Recalculate offer totals after update
    await offerService.recalculateOfferTotals(input.offer_id)

    return new StepResponse(updatedLineItem, {
      line_item_id: input.line_item_id,
      offer_id: input.offer_id,
      old_values: {
        title: oldLineItem.title,
        description: oldLineItem.description,
        quantity: oldLineItem.quantity,
        unit_price: oldLineItem.unit_price,
        discount_amount: oldLineItem.discount_amount,
        tax_rate: oldLineItem.tax_rate,
        notes: oldLineItem.notes,
      }
    })
  },
  async (compensationData, { container }) => {
    if (!compensationData) return

    const offerService = container.resolve(OFFER_MODULE)

    // Restore the previous values
    await offerService.updateOfferLineItems(
      {
        id: compensationData.line_item_id,
        ...compensationData.old_values,
      },
      { id: compensationData.line_item_id }
    )

    // Recalculate offer totals after restoration
    await offerService.recalculateOfferTotals(compensationData.offer_id)
  }
)
