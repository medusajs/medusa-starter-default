import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

import { signOrderToken } from "../utils/order-token"

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const notificationService = container.resolve(Modules.NOTIFICATION)
  const query = container.resolve("query")
  const logger = container.resolve("logger")

  // IMPORTANT: do NOT use "*" at the order level — it overrides computed totals
  // (https://docs.medusajs.com/resources/commerce-modules/order/order-totals)
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
      "customer.*",
      "payment_collections.*",
      "payment_collections.payments.*",
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
  const siteUrl = process.env.STOREFRONT_URL ?? "http://localhost:8000"
  const orderUrl = `${siteUrl}/order/${order.id}?t=${signOrderToken(order.id)}`

  await notificationService.createNotifications({
    to: order.email,
    channel: "email",
    template: "order-placed",
    data: { order, order_url: orderUrl, site_url: siteUrl },
  })
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
