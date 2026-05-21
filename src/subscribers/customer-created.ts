import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

import { signEmailVerifyToken } from "../utils/email-verify-token"

export default async function customerCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const notificationService = container.resolve(Modules.NOTIFICATION)
  const query = container.resolve("query")
  const logger = container.resolve("logger")

  const { data: [customer] } = await query.graph({
    entity: "customer",
    fields: ["id", "email", "first_name", "last_name", "has_account", "metadata"],
    filters: { id: data.id },
  })

  if (!customer?.email) {
    logger.warn(`Customer ${data.id} has no email — skipping welcome mail`)
    return
  }

  // Skip guest customers (created during checkout) — only welcome real account signups
  if (!customer.has_account) {
    logger.info(`Customer ${data.id} is a guest (no account) — skipping welcome mail`)
    return
  }

  await notificationService.createNotifications({
    to: customer.email,
    channel: "email",
    template: "welcome",
    data: { customer },
  })

  // Send verification mail unless this customer was created already-verified
  // (e.g. backfill, admin-created accounts).
  const alreadyVerified =
    (customer.metadata as Record<string, unknown> | null)?.email_verified === true
  if (alreadyVerified) return

  const storefrontUrl =
    process.env.STOREFRONT_URL || "http://localhost:8000"
  const token = signEmailVerifyToken(customer.id, customer.email)
  const verifyUrl =
    `${storefrontUrl}/verify-email` +
    `?customer_id=${encodeURIComponent(customer.id)}` +
    `&email=${encodeURIComponent(customer.email)}` +
    `&token=${encodeURIComponent(token)}`

  await notificationService.createNotifications({
    to: customer.email,
    channel: "email",
    template: "email-verify",
    data: {
      email: customer.email,
      verify_url: verifyUrl,
      customer: { first_name: customer.first_name ?? "" },
    },
  })
}

export const config: SubscriberConfig = {
  event: "customer.created",
}
