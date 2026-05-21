import {
  type AuthenticatedMedusaRequest,
  type MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { signEmailVerifyToken } from "../../../../../utils/email-verify-token"

// Admin-initiated resend of the email-verify mail. Unlike the store-side
// /store/customers/me/resend-verification route, this is not throttled and
// doesn't refuse on already-verified customers — the admin is in control
// and may have a good reason to re-send (e.g. customer lost the original
// mail). Audit log lives in Medusa's standard request logs.
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const customerId = req.params.id

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [customer] } = await query.graph({
    entity: "customer",
    fields: ["id", "email", "first_name", "has_account"],
    filters: { id: customerId },
  })

  if (!customer?.email) {
    return res.status(404).json({ message: "Customer not found" })
  }

  if (!customer.has_account) {
    return res
      .status(400)
      .json({ message: "Customer is a guest and has no account to verify" })
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

  return res.json({ sent: true })
}
