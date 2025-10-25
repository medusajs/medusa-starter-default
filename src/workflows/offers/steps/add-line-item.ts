import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MathBN } from "@medusajs/framework/utils"
import { OFFER_MODULE } from "../../../modules/offers"

type AddLineItemInput = {
  offer_id: string
  item_type?: "product" | "custom" | "discount"
  product_id?: string
  variant_id?: string
  title: string
  description?: string
  sku?: string
  quantity: number
  unit_price: number
  discount_amount?: number
  tax_rate?: number
  notes?: string
  metadata?: Record<string, any>
}

/**
 * Step to add a line item to an offer
 * Calculates pricing with MathBN and updates offer totals
 * Compensation: Deletes the created line item
 */
export const addLineItemStep = createStep(
  "add-line-item",
  async (input: AddLineItemInput, { container }) => {
    const offerService = container.resolve(OFFER_MODULE)

    // Validate required fields
    if (!input.title) {
      throw new Error('Title is required for line item')
    }

    if (!input.quantity || input.quantity <= 0) {
      throw new Error('Quantity must be greater than 0')
    }

    if (input.unit_price === undefined || input.unit_price === null) {
      throw new Error('Unit price is required')
    }

    // Calculate totals using MathBN for proper BigNumber arithmetic
    const subtotal = MathBN.mult(input.quantity, input.unit_price)
    const totalPrice = MathBN.sub(subtotal, input.discount_amount || 0)
    const taxAmount = MathBN.mult(totalPrice, input.tax_rate || 0)

    const lineItem = await offerService.createOfferLineItems({
      offer_id: input.offer_id,
      item_type: input.item_type || 'product',
      product_id: input.product_id,
      variant_id: input.variant_id,
      title: input.title,
      description: input.description,
      sku: input.sku,
      quantity: input.quantity,
      unit_price: input.unit_price,
      discount_amount: input.discount_amount || 0,
      tax_rate: input.tax_rate || 0,
      notes: input.notes,
      total_price: totalPrice.toNumber(),
      tax_amount: taxAmount.toNumber(),
    })

    // Recalculate offer totals after adding line item
    await offerService.recalculateOfferTotals(input.offer_id)

    return new StepResponse(lineItem, {
      line_item_id: lineItem.id,
      offer_id: input.offer_id,
    })
  },
  async (compensationData, { container }) => {
    if (!compensationData) return

    const offerService = container.resolve(OFFER_MODULE)

    // Delete the line item
    await offerService.deleteOfferLineItems([compensationData.line_item_id])

    // Recalculate offer totals after deletion
    await offerService.recalculateOfferTotals(compensationData.offer_id)
  }
)
