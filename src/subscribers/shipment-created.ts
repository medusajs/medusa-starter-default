import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

export default async function shipmentCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string; no_notification?: boolean }>) {
  const logger = container.resolve("logger")
  logger.info(`[shipment-created debug] received event id=${data.id} no_notification=${data.no_notification}`)

  if (data.no_notification) {
    logger.info(`[shipment-created debug] no_notification=true → skip`)
    return
  }

  const notificationService = container.resolve(Modules.NOTIFICATION)
  const query = container.resolve("query")

  let fulfillment: any
  let order: any

  try {
    const { data: [f] } = await query.graph({
      entity: "fulfillment",
      fields: [
        "id",
        "provider_id",
        "shipped_at",
        "labels.id",
        "labels.tracking_number",
        "labels.tracking_url",
        "items.id",
        "items.line_item_id",
        "items.title",
        "items.quantity",
      ],
      filters: { id: data.id },
    })
    fulfillment = f
  } catch (e: any) {
    logger.error(`[shipment-created] fulfillment query failed: ${e?.message ?? e}`)
    return
  }

  logger.info(
    `[shipment-created debug] fulfillment loaded: ${JSON.stringify({
      id: fulfillment?.id,
      provider_id: fulfillment?.provider_id,
      labels: fulfillment?.labels,
    })}`
  )

  if (!fulfillment) {
    logger.warn(`Fulfillment ${data.id} not found — skipping shipment mail`)
    return
  }

  // Find the order via the fulfillment's first item → line_item → order link
  const lineItemId = fulfillment.items?.[0]?.line_item_id
  if (!lineItemId) {
    logger.warn(`Fulfillment ${fulfillment.id} has no items — skipping`)
    return
  }

  try {
    const { data: orders } = await query.graph({
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
        "shipping_address.*",
      ],
      filters: { items: { id: lineItemId } } as any,
    })
    order = orders[0]
    logger.info(
      `[shipment-created debug] order lookup via line_item ${lineItemId} returned ${orders.length} order(s)`
    )
  } catch (e: any) {
    logger.error(`[shipment-created] order query failed: ${e?.message ?? e}`)
    return
  }

  if (!order?.email) {
    logger.warn(
      `No order/email found for fulfillment ${fulfillment.id} — skipping shipment mail`
    )
    return
  }

  logger.info(`[shipment-created debug] sending mail to ${order.email}`)

  await notificationService.createNotifications({
    to: order.email,
    channel: "email",
    template: "shipment-created",
    data: { fulfillment, order },
  })

  logger.info(`[shipment-created debug] mail dispatched`)
}

export const config: SubscriberConfig = {
  event: "shipment.created",
}
