import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { verifyCustomerEmailWorkflow } from "../../../../workflows/verify-customer-email"
import type { StoreVerifyEmailSchema } from "./validators"

// Public route — verifies an email via HMAC token without requiring a session,
// because the link is followed from an email and may land in a different
// browser than the one that holds the session cookie.
//
// Errors come from the workflow as MedusaError and are mapped by Medusa's
// error handler: invalid/expired token or email mismatch -> 400, unknown
// customer -> 404.
export const POST = async (
  req: MedusaRequest<StoreVerifyEmailSchema>,
  res: MedusaResponse,
) => {
  const { customer_id, email, token } = req.validatedBody

  await verifyCustomerEmailWorkflow(req.scope).run({
    input: { customer_id, email, token },
  })

  res.json({ verified: true })
}
