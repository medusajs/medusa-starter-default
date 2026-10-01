import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { sendEmailVerificationWorkflow } from "../workflows/send-email-verification"

// Sends the welcome mail and the email-verify mail for new account signups.
// The two are independent: a failure of one is logged and doesn't block
// the other. Idempotency keys make a re-delivered event a no-op.
export default async function customerCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const { data: [customer] } = await query.graph({
    entity: "customer",
    fields: ["id", "email", "first_name", "has_account"],
    filters: { id: data.id },
  })

  if (!customer?.email) {
    logger.warn(`Customer ${data.id} has no email — skipping welcome mail`)
    return
  }

  // Skip guest customers (created during checkout) — only real account signups.
  if (!customer.has_account) {
    logger.info(`Customer ${data.id} is a guest (no account) — skipping welcome mail`)
    return
  }

  const email = customer.email
  const sendWelcome = async () => {
    const notificationService = container.resolve(Modules.NOTIFICATION)
    await notificationService.createNotifications({
      to: email,
      channel: "email",
      template: "welcome",
      data: { customer: { first_name: customer.first_name ?? "" } },
      resource_type: "customer",
      resource_id: customer.id,
      receiver_id: customer.id,
      idempotency_key: `welcome:${customer.id}`,
    })
  }

  // Skips customers that were created already-verified (backfill, admin).
  const sendVerification = () =>
    sendEmailVerificationWorkflow(container).run({
      input: {
        customer_id: customer.id,
        skip_if_verified: true,
        idempotency_key: `email-verify:signup:${customer.id}`,
      },
    })

  const [welcome, verification] = await Promise.allSettled([
    sendWelcome(),
    sendVerification(),
  ])

  if (welcome.status === "rejected") {
    logger.error(
      `[customer-created] welcome mail failed for customer ${customer.id}: ${errorMessage(welcome.reason)}`,
    )
  }
  if (verification.status === "rejected") {
    logger.error(
      `[customer-created] verification mail failed for customer ${customer.id}: ${errorMessage(verification.reason)}`,
    )
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export const config: SubscriberConfig = {
  event: "customer.created",
}
