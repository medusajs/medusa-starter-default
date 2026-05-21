import {
  type AuthenticatedMedusaRequest,
  type MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { signEmailVerifyToken } from "../../../../../utils/email-verify-token"

// In-memory cooldown per customer ID. Single-instance only — for a clustered
// setup this should move to Redis. Keeps the implementation simple while the
// backend runs as a single process.
const COOLDOWN_MS = 60_000
const lastSentAt = new Map<string, number>()

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Not authenticated" })
  }

  const now = Date.now()
  const last = lastSentAt.get(customerId) ?? 0
  if (now - last < COOLDOWN_MS) {
    const retryAfter = Math.ceil((COOLDOWN_MS - (now - last)) / 1000)
    res.setHeader("Retry-After", retryAfter.toString())
    return res.status(429).json({
      message: "Bitte warte einen Moment, bevor du eine neue Mail anforderst.",
      retry_after: retryAfter,
    })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [customer] } = await query.graph({
    entity: "customer",
    fields: ["id", "email", "first_name", "has_account", "metadata"],
    filters: { id: customerId },
  })

  if (!customer?.email) {
    return res.status(404).json({ message: "Customer not found" })
  }

  // Already verified — succeed silently so the caller doesn't accidentally
  // expose verification state to a third party reading the response.
  const alreadyVerified =
    (customer.metadata as Record<string, unknown> | null)?.email_verified === true
  if (alreadyVerified) {
    lastSentAt.set(customerId, now)
    return res.json({ sent: true })
  }

  const notificationService = req.scope.resolve(Modules.NOTIFICATION)
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

  lastSentAt.set(customerId, now)
  return res.json({ sent: true })
}
