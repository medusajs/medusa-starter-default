import {
  type MedusaRequest,
  type MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { signOrderToken } from "../../../../../utils/order-token"
import type { StoreIssueOrderTokenSchema } from "./validators"

// Issues a confirmation token for a guest order. The caller proves they
// know the order's email (which the storefront has from the cart prior
// to completeCart), and gets back a HMAC token to include on subsequent
// reads of GET /store/orders/:id.
//
// Logged-in customers don't need this — they authenticate via JWT and
// ownership is verified by middleware.
export async function POST(
  req: MedusaRequest<StoreIssueOrderTokenSchema>,
  res: MedusaResponse,
) {
  const orderId = req.params.id
  // Already trimmed + lowercased by the validator.
  const { email } = req.validatedBody

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [order] } = await query.graph({
    entity: "order",
    fields: ["id", "email", "customer.has_account"],
    filters: { id: orderId },
  })

  // Don't differentiate between "order missing" and "email mismatch" —
  // returning 404 in both cases avoids a probing oracle.
  if (!order || order.email?.trim().toLowerCase() !== email) {
    return res.status(404).json({ message: "Not found" })
  }

  // Medusa v2 attaches a customer record to every order — guests get a
  // shadow customer with has_account=false. The token path is only valid
  // for those; a real account must use the authenticated path so a
  // leaked email can't be used to read a customer's order.
  if (order.customer?.has_account) {
    return res.status(404).json({ message: "Not found" })
  }

  return res.json({ token: signOrderToken(orderId) })
}
