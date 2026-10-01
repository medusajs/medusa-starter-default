import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

type PreorderFulfilledEvent = {
  order_id: string
  preorder_variant_id: string
}

export default async function preorderFulfilledHandler({
  event: { data },
  container,
}: SubscriberArgs<PreorderFulfilledEvent>) {
  const notificationService = container.resolve(Modules.NOTIFICATION)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

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
    (it) => it?.variant?.preorder_variant?.id === data.preorder_variant_id
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
    // One mail per fulfilled preorder variant, even if the event is redelivered
    idempotency_key: `preorder-fulfilled:${data.order_id}:${data.preorder_variant_id}`,
  })
}

export const config: SubscriberConfig = {
  event: "preorder.fulfilled",
}
