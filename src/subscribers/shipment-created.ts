import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { buildOrderUrl, getStorefrontUrl } from "../utils/urls"

type ShipmentCreatedEvent = {
  id: string
  no_notification?: boolean
}

export type ShipmentMailFulfillment = {
  id: string
  provider_id?: string | null
  shipped_at?: string | Date | null
  labels?: Array<{
    tracking_number?: string | null
    tracking_url?: string | null
  }> | null
  items?: Array<{
    line_item_id?: string | null
    title?: string | null
    quantity?: number | null
  }> | null
  order?: {
    id: string
    display_id?: number | null
    email?: string | null
  } & Record<string, unknown> | null
}

export default async function shipmentCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<ShipmentCreatedEvent>) {
  if (data.no_notification) return

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const notificationService = container.resolve(Modules.NOTIFICATION)

  // The order is resolved through the order <-> fulfillment module link.
  const { data: [result] } = await query.graph({
    entity: "fulfillment",
    fields: [
      "id",
      "provider_id",
      "shipped_at",
      "labels.tracking_number",
      "labels.tracking_url",
      "items.line_item_id",
      "items.title",
      "items.quantity",
      "order.id",
      "order.display_id",
      "order.email",
      "order.items.id",
      "order.items.title",
      "order.items.product_title",
      "order.items.variant_title",
      "order.items.thumbnail",
      "order.shipping_address.*",
    ],
    filters: { id: data.id },
  })

  const fulfillment = result as ShipmentMailFulfillment | undefined
  if (!fulfillment) {
    logger.warn(`Fulfillment ${data.id} not found — skipping shipment mail`)
    return
  }

  const { order, ...fulfillmentData } = fulfillment
  if (!order?.email) {
    logger.warn(
      `No order/email found for fulfillment ${fulfillment.id} — skipping shipment mail`,
    )
    return
  }

  await notificationService.createNotifications({
    to: order.email,
    channel: "email",
    template: "shipment-created",
    data: {
      fulfillment: fulfillmentData,
      order,
      order_url: buildOrderUrl(order.id),
      site_url: getStorefrontUrl(),
    },
    resource_type: "fulfillment",
    resource_id: fulfillment.id,
    idempotency_key: `shipment:${fulfillment.id}`,
  })
}

export const config: SubscriberConfig = {
  event: "shipment.created",
}
