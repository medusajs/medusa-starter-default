import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { maskEmail } from "../utils/mask-email"
import { buildPasswordResetUrl } from "../utils/urls"

type PasswordResetEvent = {
  entity_id: string
  token: string
  actor_type: string
}

export default async function passwordResetHandler({
  event: { data },
  container,
}: SubscriberArgs<PasswordResetEvent>) {
  const { entity_id: email, token, actor_type } = data
  const notificationService = container.resolve(Modules.NOTIFICATION)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  // Customers land on the storefront, admin users on the dashboard's form.
  const resetUrl = buildPasswordResetUrl({ actorType: actor_type, token, email })

  // Never log the URL or token — it grants a password change.
  logger.info(
    `[password-reset] sending mail to ${maskEmail(email)} (actor=${actor_type})`,
  )

  // No idempotency key: every reset request must produce a mail.
  await notificationService.createNotifications({
    to: email,
    channel: "email",
    template: "password-reset",
    data: {
      email,
      reset_url: resetUrl,
      actor_type,
    },
  })
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}
