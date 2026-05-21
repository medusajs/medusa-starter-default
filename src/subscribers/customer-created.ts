import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

export default async function customerCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const notificationService = container.resolve(Modules.NOTIFICATION)
  const query = container.resolve("query")
  const logger = container.resolve("logger")

  const { data: [customer] } = await query.graph({
    entity: "customer",
    fields: ["id", "email", "first_name", "last_name", "has_account"],
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
}

export const config: SubscriberConfig = {
  event: "customer.created",
}
