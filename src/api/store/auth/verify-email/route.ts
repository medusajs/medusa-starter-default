import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { verifyCustomerEmailWorkflow } from "../../../../workflows/verify-customer-email"

type Body = {
  customer_id?: string
  email?: string
  token?: string
}

// Public route — verifies an email via HMAC token without requiring a session,
// because the link is followed from an email and may land in a different
// browser than the one that holds the session cookie.
export const POST = async (
  req: MedusaRequest<Body>,
  res: MedusaResponse,
) => {
  const customer_id = (req.body?.customer_id ?? "").toString().trim()
  const email = (req.body?.email ?? "").toString().trim().toLowerCase()
  const token = (req.body?.token ?? "").toString()

  if (!customer_id || !email || !token) {
    return res
      .status(400)
      .json({ message: "customer_id, email and token are required" })
  }

  try {
    await verifyCustomerEmailWorkflow(req.scope).run({
      input: { customer_id, email, token },
    })
  } catch (err) {
    if (err instanceof MedusaError) {
      const status = err.type === MedusaError.Types.NOT_FOUND ? 404 : 400
      return res.status(status).json({ message: err.message })
    }
    throw err
  }

  return res.json({ verified: true })
}
