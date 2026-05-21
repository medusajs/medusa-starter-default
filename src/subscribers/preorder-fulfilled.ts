import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

type PreorderFulfilledEvent = {
  order_id: string
  preorder_variant_id: string
}

export default async function preorderFulfilledHandler({
  event: { data },
  container,
}: SubscriberArgs<PreorderFulfilledEvent>) {
  const notificationService = container.resolve(Modules.NOTIFICATION)
  const query = container.resolve("query")
  const logger = container.resolve("logger")

  const { data: [order] } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "items.id",
      "items.title",
      "items.product_title",
      "items.variant_title",
      "items.thumbnail",
      "items.quantity",
      "items.variant.id",
      "items.variant.preorder_variant.id",
    ],
    filters: { id: data.order_id },
  })

  if (!order?.email) {
    logger.warn(
      `Order ${data.order_id} has no email — skipping preorder-fulfilled mail`
    )
    return
  }

  // Only items whose variant points to the just-fulfilled preorder_variant
  const fulfilledItems = (order.items ?? []).filter(
    (it: any) => it.variant?.preorder_variant?.id === data.preorder_variant_id
  )

  if (fulfilledItems.length === 0) {
    logger.warn(
      `No matching items for preorder_variant ${data.preorder_variant_id} on order ${data.order_id}`
    )
    return
  }

  await notificationService.createNotifications({
    to: order.email,
    channel: "email",
    template: "preorder-fulfilled",
    data: { order, fulfilled_items: fulfilledItems },
  })
}

export const config: SubscriberConfig = {
  event: "preorder.fulfilled",
}
