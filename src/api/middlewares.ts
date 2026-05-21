import {
  authenticate,
  defineMiddlewares,
  validateAndTransformBody,
  type AuthenticatedMedusaRequest,
  type MedusaNextFunction,
  type MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  UpsertPreorderVariantSchema,
} from "./admin/variants/[id]/preorders/route"
import {
  AdminSetEmailVerifiedSchema,
} from "./admin/customers/[id]/email-verified/route"
import { verifyOrderToken } from "../utils/order-token"

// Blocks cart completion for accounts that haven't verified their email yet.
// Guests (no customer_id, or shadow customer with has_account=false) pass
// through — the gate is account-only. We resolve the email-verified flag
// from the customer attached to the cart rather than from the auth context,
// because the cart's customer is what the resulting order is tied to.
async function requireEmailVerified(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction,
) {
  const cartId = req.params?.id
  if (!cartId) return next()

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [cart] } = await query.graph({
    entity: "cart",
    fields: ["id", "customer.id", "customer.has_account", "customer.metadata"],
    filters: { id: cartId },
  })

  const customer = (cart as { customer?: {
    id?: string
    has_account?: boolean | null
    metadata?: Record<string, unknown> | null
  } | null } | undefined)?.customer

  if (!customer?.has_account) return next()
  if (customer.metadata?.email_verified === true) return next()

  return res.status(403).json({
    type: "email_not_verified",
    message:
      "Bitte bestätige deine E-Mail-Adresse, bevor du die Bestellung abschließt.",
  })
}

// Returns the customer id when the request is authenticated as a customer,
// otherwise null. JWT/session is populated by `authenticate(...)` running
// upstream in the same matcher — see route definitions below.
function authenticatedCustomerId(req: AuthenticatedMedusaRequest): string | null {
  if (req.auth_context?.actor_type === "customer" && req.auth_context.actor_id) {
    return req.auth_context.actor_id
  }
  return null
}

async function loadOrderOwnership(
  req: AuthenticatedMedusaRequest,
  orderId: string,
): Promise<{
  id: string
  customer_id: string | null
  has_account: boolean
} | null> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [order] } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id", "customer.has_account"],
    filters: { id: orderId },
  })
  if (!order) return null
  const o = order as {
    id: string
    customer_id: string | null
    customer?: { has_account?: boolean | null } | null
  }
  return {
    id: o.id,
    customer_id: o.customer_id,
    has_account: !!o.customer?.has_account,
  }
}

// Authorizes access to a single order: logged-in customer must own it,
// or the request must carry a valid HMAC token in the x-kiji-order-token
// header. Returns 404 on any mismatch to avoid leaking existence.
//
// Token is passed via header (not query/body) because Medusa's strict
// request validation rejects unknown query/body fields with 400.
async function verifyOrderAccess(
  req: AuthenticatedMedusaRequest<{ order_id?: string }>,
  res: MedusaResponse,
  next: MedusaNextFunction,
) {
  const orderId =
    req.params?.id ??
    req.body?.order_id ??
    (typeof req.query?.order_id === "string" ? req.query.order_id : null)

  if (!orderId) {
    return res.status(400).json({ message: "order_id required" })
  }

  const order = await loadOrderOwnership(req, orderId)
  if (!order) {
    return res.status(404).json({ message: "Not found" })
  }

  const customerId = authenticatedCustomerId(req)
  if (customerId && order.customer_id === customerId) {
    return next()
  }

  // Guest path: HMAC token must match. Only allowed when the attached
  // customer record is a guest shadow (has_account=false) — otherwise a
  // leaked email + token combo could read a real customer's order.
  if (!order.has_account) {
    const headerVal = req.headers?.["x-kiji-order-token"]
    const token = Array.isArray(headerVal) ? headerVal[0] : headerVal
    if (token && verifyOrderToken(orderId, token)) {
      return next()
    }
  }

  return res.status(404).json({ message: "Not found" })
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/variants/:id/preorders",
      methods: ["POST"],
      middlewares: [
        validateAndTransformBody(UpsertPreorderVariantSchema),
      ],
    },
    {
      matcher: "/admin/customers/:id/email-verified",
      methods: ["POST"],
      middlewares: [
        validateAndTransformBody(AdminSetEmailVerifiedSchema),
      ],
    },
    // Authorization for single-order reads. The token-issue endpoint
    // /store/orders/:id/token is intentionally excluded — it has its
    // own email-based check and is the bootstrap for guest tokens.
    {
      matcher: "/store/orders/:id",
      methods: ["GET"],
      middlewares: [
        authenticate("customer", ["session", "bearer"], { allowUnauthenticated: true }),
        verifyOrderAccess,
      ],
    },
    {
      matcher: "/store/orders/:id/preorders",
      methods: ["GET"],
      middlewares: [
        authenticate("customer", ["session", "bearer"], { allowUnauthenticated: true }),
        verifyOrderAccess,
      ],
    },
    // Returns: body carries order_id and optional token.
    {
      matcher: "/store/returns",
      methods: ["POST"],
      middlewares: [
        authenticate("customer", ["session", "bearer"], { allowUnauthenticated: true }),
        verifyOrderAccess,
      ],
    },
    // Email-verify gate for cart completion. Guests pass through; account
    // holders need metadata.email_verified === true.
    {
      matcher: "/store/carts/:id/complete",
      methods: ["POST"],
      middlewares: [requireEmailVerified],
    },
    {
      matcher: "/store/carts/:id/complete-preorder",
      methods: ["POST"],
      middlewares: [requireEmailVerified],
    },
    // Resend verification email needs an authenticated customer session.
    {
      matcher: "/store/customers/me/resend-verification",
      methods: ["POST"],
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
      ],
    },
  ],
})
