import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

type StepInput = {
  purchase_order: any
}

export const validatePurchaseOrderSendable = createStep(
  "validate-purchase-order-sendable",
  async function ({ purchase_order }: StepInput) {
    // Validate that the PO is in draft status
    if (purchase_order.status !== "draft") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Purchase order must be in draft status to be sent. Current status: ${purchase_order.status}`
      )
    }

    // Validate that the PO has at least one item
    if (!purchase_order.items || purchase_order.items.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Purchase order must have at least one item before sending"
      )
    }

    // Validate that all items have valid quantities and costs
    for (const item of purchase_order.items) {
      if (item.quantity_ordered <= 0) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Item "${item.product_title}" has invalid quantity: ${item.quantity_ordered}`
        )
      }

      if (item.unit_cost <= 0) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Item "${item.product_title}" has invalid unit cost: ${item.unit_cost}`
        )
      }
    }

    // Validate supplier_id exists
    if (!purchase_order.supplier_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Purchase order must have a supplier before sending"
      )
    }

    return new StepResponse({ valid: true })
  }
)
