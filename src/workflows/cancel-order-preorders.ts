import { createWorkflow, transform, when, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { updatePreordersStep } from "./steps/update-preorders"
import { PreorderStatus } from "../modules/preorder/models/preorder"

type WorkflowInput = {
  order_id: string
}

// Marks all pending preorders of an order as cancelled
export const cancelOrderPreordersWorkflow = createWorkflow(
  "cancel-order-preorders",
  function (input: WorkflowInput) {
    const { data: preorders } = useQueryGraphStep({
      entity: "preorder",
      fields: ["id"],
      filters: {
        order_id: input.order_id,
        status: PreorderStatus.PENDING,
      },
    })

    const updates = transform({ preorders }, function ({ preorders }) {
      return preorders.map((preorder) => ({
        id: preorder.id,
        status: PreorderStatus.CANCELLED,
      }))
    })

    const cancelled = when("cancel-pending-preorders", { updates }, function ({ updates }) {
      return updates.length > 0
    }).then(function () {
      return updatePreordersStep(updates)
    })

    const result = transform({ cancelled }, function ({ cancelled }) {
      return cancelled ?? []
    })

    return new WorkflowResponse(result)
  }
)
