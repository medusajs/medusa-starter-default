import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { validateOfferEditableStep } from "./steps/validate-offer-editable"
import { addLineItemStep } from "./steps/add-line-item"
import { recalculateOfferTotalsStep } from "./steps/recalculate-offer-totals"

export type AddLineItemToOfferInput = {
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
 * Workflow to add a line item to an offer
 * Validates offer is editable, adds line item, and recalculates totals
 */
export const addLineItemToOfferWorkflow = createWorkflow(
  "add-line-item-to-offer",
  (input: AddLineItemToOfferInput) => {
    // Validate offer can be edited (DRAFT status only)
    validateOfferEditableStep(input.offer_id)

    // Add line item to offer
    const lineItem = addLineItemStep(input)

    // Recalculate offer totals
    recalculateOfferTotalsStep({ offer_id: input.offer_id })

    return new WorkflowResponse(lineItem)
  }
)
