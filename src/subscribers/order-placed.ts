import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { buildOrderUrl, getStorefrontUrl } from "../utils/urls"

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const notificationService = container.resolve(Modules.NOTIFICATION)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  // Totals are computed fields: Query only calculates them when they're
  // requested by name (a `*` wildcard returns stored columns only), so each
  // total the template renders is listed explicitly.
  // Only what the template needs goes into the notification data — it is
  // persisted on the notification record.
  const { data: [order] } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "currency_code",
      "created_at",
      "total",
      "subtotal",
      "tax_total",
      "discount_total",
      "shipping_total",
      "shipping_subtotal",
      "shipping_tax_total",
      "item_total",
      "item_subtotal",
      "item_tax_total",
      "original_item_total",
      "original_item_subtotal",
      "original_total",
      "items.*",
      "items.adjustments.*",
      "items.variant.id",
      "items.variant.preorder_variant.id",
      "items.variant.preorder_variant.available_date",
      "items.variant.preorder_variant.status",
      "shipping_methods.*",
      "shipping_methods.adjustments.*",
      "shipping_address.*",
      "customer.first_name",
      "payment_collections.payments.provider_id",
    ],
    filters: { id: data.id },
  })

  if (!order?.email) {
    logger.warn(`Order ${data.id} has no email — skipping confirmation`)
    return
  }

  // The confirmation page is gated by either a customer JWT (logged-in)
  // or this HMAC token (guests). The token is harmless when the recipient
  // is logged in — the middleware short-circuits on the JWT match first.
  await notificationService.createNotifications({
    to: order.email,
    channel: "email",
    template: "order-placed",
    data: {
      order,
      order_url: buildOrderUrl(order.id),
      site_url: getStorefrontUrl(),
    },
    resource_type: "order",
    resource_id: order.id,
    idempotency_key: `order-placed:${order.id}`,
  })
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
