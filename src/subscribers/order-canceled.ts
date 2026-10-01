import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { OrderWorkflowEvents } from "@medusajs/framework/utils"
import { cancelOrderPreordersWorkflow } from "../workflows/cancel-order-preorders"

// Pending preorders of a canceled order must never be fulfilled
export default async function orderCanceledPreordersHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  await cancelOrderPreordersWorkflow(container).run({
    input: {
      order_id: data.id,
    },
  })
}

export const config: SubscriberConfig = {
  event: OrderWorkflowEvents.CANCELED,
}
