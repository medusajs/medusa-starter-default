import { InferTypeOf } from "@medusajs/framework/types"
import { PreorderVariant } from "../modules/preorder/models/preorder-variant"
import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createOrderFulfillmentWorkflow, emitEventStep, useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { retrieveItemsToFulfillStep, RetrieveItemsToFulfillStepInput } from "./steps/retrieve-items-to-fulfill"
import { updatePreordersStep } from "./steps/update-preorders"
import { PreorderStatus } from "../modules/preorder/models/preorder"

type WorkflowInput = {
  preorder_id: string
  item: InferTypeOf<typeof PreorderVariant>
  order_id: string
}

export const fulfillPreorderWorkflow = createWorkflow(
  "fulfill-preorder",
  (input: WorkflowInput) => {
    const { data: orders } = useQueryGraphStep({
      entity: "order",
      fields: ["items.*"],
      filters: {
        id: input.order_id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    })

    const { items_to_fulfill } = retrieveItemsToFulfillStep({
      preorder_variant: input.item,
      line_items: orders[0].items,
    } as unknown as RetrieveItemsToFulfillStepInput)

    const fulfillment = createOrderFulfillmentWorkflow.runAsStep({
      input: {
        order_id: input.order_id,
        items: items_to_fulfill,
      },
    })

    updatePreordersStep([{
      id: input.preorder_id,
      status: PreorderStatus.FULFILLED,
    }])

    emitEventStep({
      eventName: "preorder.fulfilled",
      data: {
        order_id: input.order_id,
        preorder_variant_id: input.item.id,
      },
    })

    return new WorkflowResponse({
      fulfillment,
    })
  }
)
