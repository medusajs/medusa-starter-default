import {
  type MedusaRequest,
  type MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import type { StoreEmailExistsSchema } from "./validators"

// Pre-flight for the storefront's guest checkout: does a real customer
// account already exist for this email?
//
// Without this hint a guest entering a registered customer's email would
// (a) silently get their order auto-linked to that account
// (has_account=true), and (b) the storefront's HMAC guest path on the
// /order/:id confirmation page would then be rejected by the existing
// access middleware → "Bestellung nicht gefunden" UX, even though the
// order succeeded. The storefront uses this endpoint to redirect the
// user into login before completing the order.
//
// Email-enumeration trade-off: standard e-commerce pattern (Shopify,
// Stripe). Mitigate at the reverse-proxy / CDN level with per-IP rate
// limits on this exact path (suggested: 10 req/min).
//
// Filters by has_account=true on purpose — shadow customer records that
// Medusa creates for past guest orders carry the same email but don't
// trigger the bug, so we don't want to confuse the storefront UX by
// flagging them.

interface EmailExistsResponse {
  exists: boolean
}

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(
  req: MedusaRequest<StoreEmailExistsSchema>,
  res: MedusaResponse<EmailExistsResponse>,
) {
  // Already trimmed + lowercased by the validator.
  const { email } = req.validatedBody

  if (!email || !EMAIL_FORMAT.test(email)) {
    return res.json({ exists: false })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: customers } = await query.graph({
    entity: "customer",
    fields: ["id"],
    filters: { email, has_account: true },
    pagination: { take: 1 },
  })

  return res.json({ exists: customers.length > 0 })
}
