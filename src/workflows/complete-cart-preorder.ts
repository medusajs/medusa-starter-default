import {
  createWorkflow,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  acquireLockStep,
  completeCartWorkflow,
  releaseLockStep,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows"
import { retrievePreorderItemIdsStep } from "./steps/retrieve-preorder-items"
import { createPreordersStep } from "./steps/create-preorders"

type WorkflowInput = {
  cart_id: string
}

export const completeCartPreorderWorkflow = createWorkflow(
  "complete-cart-preorder",
  function (input: WorkflowInput) {
    // Same lock as core cart completion: the nested completeCartWorkflow skips
    // its own lock when run as a sub-workflow, and payment authorization can be slow.
    acquireLockStep({
      key: input.cart_id,
      timeout: 30,
      ttl: 120,
    })

    // Idempotent: returns the existing order if the cart was already completed
    const { id: orderId } = completeCartWorkflow.runAsStep({
      input: {
        id: input.cart_id,
      },
    })

    const { data: existingPreorders } = useQueryGraphStep({
      entity: "preorder",
      fields: ["id", "item_id"],
      filters: {
        order_id: orderId,
      },
    })

    // Explicit fields only: "*" on order triggers total calculation since 2.19
    const { data: orders } = useQueryGraphStep({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "status",
        "currency_code",
        "created_at",
        "items.id",
        "items.title",
        "items.quantity",
        "items.variant_id",
        "items.variant.preorder_variant.id",
        "items.variant.preorder_variant.status",
        "items.variant.preorder_variant.available_date",
      ],
      filters: {
        id: orderId,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    }).config({ name: "retrieve-order" })

    const order = transform({ orders }, function ({ orders }) {
      return orders[0]
    })

    const preorderStepInput = transform(
      { order, existingPreorders },
      function ({ order, existingPreorders }) {
        return {
          items: order.items ?? [],
          existing_preorder_variant_ids: existingPreorders.map((p) => p.item_id),
        }
      }
    )

    const preorderVariantIds = retrievePreorderItemIdsStep(preorderStepInput)

    // Only creates preorders that don't exist yet (safe on retries / repeated calls)
    when(
      "create-missing-preorders",
      { preorderVariantIds },
      function ({ preorderVariantIds }) {
        return preorderVariantIds.length > 0
      }
    ).then(function () {
      createPreordersStep({
        preorder_variant_ids: preorderVariantIds,
        order_id: orderId,
      })
    })

    releaseLockStep({
      key: input.cart_id,
    })

    return new WorkflowResponse({
      order,
    })
  }
)
