import {
  type AuthenticatedMedusaRequest,
  type MedusaResponse,
} from "@medusajs/framework/http"

import { sendEmailVerificationWorkflow } from "../../../../../workflows/send-email-verification"

// Admin-initiated resend of the email-verify mail. Unlike the store-side
// /store/customers/me/resend-verification route, this is not throttled and
// doesn't skip already-verified customers — the admin is in control and may
// have a good reason to re-send (e.g. customer lost the original mail).
// Unknown customer -> 404, guest customer -> 400 (thrown by the workflow).
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  await sendEmailVerificationWorkflow(req.scope).run({
    input: { customer_id: req.params.id, skip_if_verified: false },
  })

  res.json({ sent: true })
}
