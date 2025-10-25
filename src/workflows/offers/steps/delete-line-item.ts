import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { OFFER_MODULE } from "../../../modules/offers"

type DeleteLineItemInput = {
  line_item_id: string
  offer_id: string
}

/**
 * Step to delete a line item from an offer
 * Compensation: Restores the deleted line item
 */
export const deleteLineItemStep = createStep(
  "delete-line-item",
  async (input: DeleteLineItemInput, { container }) => {
    const offerService = container.resolve(OFFER_MODULE)

    // Retrieve line item data before deletion for compensation
    const lineItem = await offerService.retrieveOfferLineItem(input.line_item_id)

    // Delete the line item
    await offerService.deleteOfferLineItems([input.line_item_id])

    // Recalculate offer totals after deletion
    await offerService.recalculateOfferTotals(input.offer_id)

    return new StepResponse(
      { deleted: true },
      {
        offer_id: input.offer_id,
        deleted_line_item: {
          item_type: lineItem.item_type,
          product_id: lineItem.product_id,
          variant_id: lineItem.variant_id,
          title: lineItem.title,
          description: lineItem.description,
          sku: lineItem.sku,
          quantity: lineItem.quantity,
          unit_price: lineItem.unit_price,
          discount_amount: lineItem.discount_amount,
          tax_rate: lineItem.tax_rate,
          notes: lineItem.notes,
          metadata: lineItem.metadata,
        }
      }
    )
  },
  async (compensationData, { container }) => {
    if (!compensationData) return

    const offerService = container.resolve(OFFER_MODULE)

    // Restore the deleted line item
    await offerService.createOfferLineItems({
      offer_id: compensationData.offer_id,
      ...compensationData.deleted_line_item,
    })

    // Recalculate offer totals after restoration
    await offerService.recalculateOfferTotals(compensationData.offer_id)
  }
)
