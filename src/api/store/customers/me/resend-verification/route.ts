import {
  type AuthenticatedMedusaRequest,
  type MedusaResponse,
} from "@medusajs/framework/http"

import { claimResendVerificationCooldown } from "../../../../../utils/resend-verification-cooldown"
import { sendEmailVerificationWorkflow } from "../../../../../workflows/send-email-verification"

// Resends the verification mail to the logged-in customer (session/bearer
// enforced by middleware). Throttled to one request per 60s per customer
// -> 429 with Retry-After.
//
// Already-verified customers get `{ sent: true }` without a mail, so the
// response doesn't reveal verification state.
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const customerId = req.auth_context.actor_id

  const claim = await claimResendVerificationCooldown(req.scope, customerId)
  if (!claim.ok) {
    res.setHeader("Retry-After", claim.retryAfterSeconds.toString())
    return res.status(429).json({
      message: "Bitte warte einen Moment, bevor du eine neue Mail anforderst.",
      retry_after: claim.retryAfterSeconds,
    })
  }

  try {
    // No idempotency_key: every accepted resend must actually send.
    await sendEmailVerificationWorkflow(req.scope).run({
      input: { customer_id: customerId, skip_if_verified: true },
    })
  } catch (err) {
    await claim.release()
    throw err
  }

  return res.json({ sent: true })
}
