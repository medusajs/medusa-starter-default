import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError, OrderStatus } from "@medusajs/framework/utils"
import { PreorderStatus } from "../../modules/preorder/models/preorder"

type OrderItemInfo = {
  id: string
  variant_id?: string | null
  quantity?: number | null
  detail?: {
    quantity?: number | null
    fulfilled_quantity?: number | null
  } | null
} | null

export type RetrieveItemsToFulfillStepInput = {
  preorder: {
    id: string
    status: string
    item: {
      id: string
      variant_id: string
    }
  }
  order: {
    id: string
    status: string
    items?: OrderItemInfo[] | null
  }
}

export type PreorderFulfillmentAction =
  // Preorder is no longer pending (already processed elsewhere)
  | "skip"
  // Order canceled or nothing left to deliver: mark preorder cancelled
  | "cancel"
  // Everything was already fulfilled (e.g. manually): mark preorder fulfilled
  | "mark_fulfilled"
  // Create a fulfillment for the remaining quantities
  | "fulfill"

export type RetrieveItemsToFulfillStepOutput = {
  action: PreorderFulfillmentAction
  items_to_fulfill: { id: string; quantity: number }[]
}

/**
 * Decides what to do with a preorder and computes the remaining
 * (not yet fulfilled) quantities of the matching order items.
 */
export function planPreorderFulfillment({
  preorder,
  order,
}: RetrieveItemsToFulfillStepInput): RetrieveItemsToFulfillStepOutput {
  if (preorder.status !== PreorderStatus.PENDING) {
    return { action: "skip", items_to_fulfill: [] }
  }

  if (order.status === OrderStatus.CANCELED) {
    return { action: "cancel", items_to_fulfill: [] }
  }

  const matchingItems = (order.items ?? []).filter(
    (item): item is NonNullable<OrderItemInfo> =>
      !!item?.variant_id && item.variant_id === preorder.item.variant_id
  )

  if (!matchingItems.length) {
    // Don't guess (e.g. variant deleted); leave pending for manual review
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Order ${order.id} has no item for variant ${preorder.item.variant_id} (preorder ${preorder.id})`
    )
  }

  let orderedQuantity = 0
  const itemsToFulfill: RetrieveItemsToFulfillStepOutput["items_to_fulfill"] = []

  for (const item of matchingItems) {
    // detail holds the current (post order-edit) quantities
    const quantity = Number(item.detail?.quantity ?? item.quantity ?? 0)
    const fulfilled = Number(item.detail?.fulfilled_quantity ?? 0)
    const remaining = quantity - fulfilled

    orderedQuantity += quantity

    if (remaining > 0) {
      itemsToFulfill.push({ id: item.id, quantity: remaining })
    }
  }

  if (orderedQuantity <= 0) {
    return { action: "cancel", items_to_fulfill: [] }
  }

  if (!itemsToFulfill.length) {
    return { action: "mark_fulfilled", items_to_fulfill: [] }
  }

  return { action: "fulfill", items_to_fulfill: itemsToFulfill }
}

export const retrieveItemsToFulfillStep = createStep(
  "retrieve-items-to-fulfill",
  async function (input: RetrieveItemsToFulfillStepInput) {
    return new StepResponse(planPreorderFulfillment(input))
  }
)
