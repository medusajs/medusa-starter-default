import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

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
  const logger = container.resolve("logger")

  const storefrontUrl =
    process.env.STOREFRONT_URL || "http://localhost:8000"
  const backendUrl =
    process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"

  // Customer flow: storefront expects ONLY ?token=... (no email param)
  // Admin flow: Medusa Admin's built-in form uses ?token=...&email=...
  const resetUrl =
    actor_type === "customer"
      ? `${storefrontUrl}/reset-password?token=${encodeURIComponent(token)}`
      : `${backendUrl}/app/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`

  logger.info(
    `[password-reset] sending mail to ${email} (actor=${actor_type}) url=${resetUrl}`
  )

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
