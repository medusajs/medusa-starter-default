import { createWorkflow, transform, when, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import {
  createOrderFulfillmentWorkflow,
  emitEventStep,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows"
import { retrieveItemsToFulfillStep } from "./steps/retrieve-items-to-fulfill"
import { updatePreordersStep } from "./steps/update-preorders"
import { PreorderStatus } from "../modules/preorder/models/preorder"

type WorkflowInput = {
  preorder_id: string
}

export const fulfillPreorderWorkflow = createWorkflow(
  "fulfill-preorder",
  function (input: WorkflowInput) {
    // Re-read inside the workflow so the decision is based on current state
    const { data: preorders } = useQueryGraphStep({
      entity: "preorder",
      fields: [
        "id",
        "status",
        "order_id",
        "item.id",
        "item.variant_id",
      ],
      filters: {
        id: input.preorder_id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    })

    const preorder = transform({ preorders }, function ({ preorders }) {
      return preorders[0]
    })

    const { data: orders } = useQueryGraphStep({
      entity: "order",
      fields: [
        "id",
        "status",
        "items.id",
        "items.variant_id",
        "items.quantity",
        "items.detail.quantity",
        "items.detail.fulfilled_quantity",
      ],
      filters: {
        id: preorder.order_id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    }).config({ name: "retrieve-preorder-order" })

    const plan = retrieveItemsToFulfillStep(
      transform({ preorder, orders }, function ({ preorder, orders }) {
        return {
          preorder: {
            id: preorder.id,
            status: preorder.status,
            item: {
              id: preorder.item.id,
              variant_id: preorder.item.variant_id,
            },
          },
          order: orders[0],
        }
      })
    )

    when("cancel-preorder", { plan }, function ({ plan }) {
      return plan.action === "cancel"
    }).then(function () {
      updatePreordersStep([{
        id: input.preorder_id,
        status: PreorderStatus.CANCELLED,
      }]).config({ name: "cancel-preorder-status" })
    })

    when("mark-preorder-fulfilled", { plan }, function ({ plan }) {
      return plan.action === "mark_fulfilled"
    }).then(function () {
      updatePreordersStep([{
        id: input.preorder_id,
        status: PreorderStatus.FULFILLED,
      }]).config({ name: "mark-preorder-fulfilled-status" })
    })

    const fulfillment = when("fulfill-preorder-items", { plan }, function ({ plan }) {
      return plan.action === "fulfill"
    }).then(function () {
      const createdFulfillment = createOrderFulfillmentWorkflow.runAsStep({
        input: {
          order_id: preorder.order_id,
          items: plan.items_to_fulfill,
        },
      })

      updatePreordersStep([{
        id: input.preorder_id,
        status: PreorderStatus.FULFILLED,
      }])

      emitEventStep({
        eventName: "preorder.fulfilled",
        data: {
          order_id: preorder.order_id,
          preorder_variant_id: preorder.item.id,
        },
      })

      return createdFulfillment
    })

    return new WorkflowResponse({
      action: plan.action,
      fulfillment,
    })
  }
)
