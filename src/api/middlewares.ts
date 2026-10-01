import {
  allowFields,
  authenticate,
  defineMiddlewares,
  validateAndTransformBody,
  type AuthenticatedMedusaRequest,
  type MedusaNextFunction,
  type MedusaRequest,
  type MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { UpsertPreorderVariantSchema } from "./admin/variants/[id]/preorders/validators"
import { AdminSetEmailVerifiedSchema } from "./admin/customers/[id]/email-verified/validators"
import { StoreVerifyEmailSchema } from "./store/auth/verify-email/validators"
import { StoreEmailExistsSchema } from "./store/customers/email-exists/validators"
import { StoreIssueOrderTokenSchema } from "./store/orders/[id]/token/validators"
import { verifyOrderToken } from "../utils/order-token"

// Extra `fields` the storefront requests (kiji-store-mjs src/lib/medusa.ts)
// that aren't in Medusa 2.21's store allowlists. Since 2.21 a requested field
// must be in the route's `allowed` list *verbatim* (no prefix/relation
// inheritance), otherwise it's silently dropped from the response.
//
// These must be registered as global middlewares (no `method(s)` key):
// Medusa runs global middlewares before the core routes' query validation,
// which is where `req.allowed` is consumed. A global matcher is a path
// prefix, so "/store/products" also covers "/store/products/:id".
const PREORDER_VARIANT_FIELDS = ["id", "available_date", "status"]

// PRODUCT_FIELDS (list + retrieve): preorder link on variants.
const STORE_PRODUCT_EXTRA_FIELDS = PREORDER_VARIANT_FIELDS.map(
  (f) => `variants.preorder_variant.${f}`,
)

// CART_FIELDS (every cart route incl. line-items, shipping-methods,
// promotions, customer transfer): preorder hint per line item and the
// product/category metadata the FSK age-gate reads.
const STORE_CART_EXTRA_FIELDS = [
  "items.variant.id",
  ...PREORDER_VARIANT_FIELDS.map((f) => `items.variant.preorder_variant.${f}`),
  "items.product.metadata",
  "items.product.categories.metadata",
]

// ORDER_FIELDS (GET /store/orders/:id): preorder hint per item, promotion
// details for the cost breakdown, and returns for the return flow.
// cart.id / summary / fulfillment_status / payment_status are allowed by default.
const STORE_ORDER_EXTRA_FIELDS = [
  ...PREORDER_VARIANT_FIELDS.map((f) => `items.variant.preorder_variant.${f}`),
  "promotions.application_method",
  "returns",
  "returns.items",
]

// Customers must never flip their own verification flag. Core
// POST /store/customers and POST /store/customers/me accept free-form
// `metadata`, and validateAndTransformBody passes it through untouched.
// Registered as a global middleware (method checked inline) because Medusa
// orders global middlewares before every method-scoped one — including the
// core route's body validation — so the request is rejected before any
// validation/workflow runs. Covers every POST under /store/customers.
function rejectEmailVerifiedMetadata(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction,
) {
  if (req.method !== "POST") return next()

  const metadata = (req.body as { metadata?: unknown } | undefined)?.metadata
  if (
    metadata &&
    typeof metadata === "object" &&
    Object.prototype.hasOwnProperty.call(metadata, "email_verified")
  ) {
    return res.status(400).json({
      type: "invalid_data",
      message: "metadata.email_verified can't be set by customers",
    })
  }

  return next()
}

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
    // --- Global (no method key) — must stay method-less, see notes above.
    {
      matcher: "/store/products",
      middlewares: [allowFields(STORE_PRODUCT_EXTRA_FIELDS)],
    },
    {
      matcher: "/store/carts",
      middlewares: [allowFields(STORE_CART_EXTRA_FIELDS)],
    },
    {
      matcher: "/store/orders",
      middlewares: [allowFields(STORE_ORDER_EXTRA_FIELDS)],
    },
    {
      matcher: "/store/customers",
      middlewares: [rejectEmailVerifiedMetadata],
    },

    // --- Admin
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

    // --- Store: order access
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
    {
      matcher: "/store/orders/:id/token",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(StoreIssueOrderTokenSchema)],
    },
    // Returns: body carries order_id; guest token comes via x-kiji-order-token.
    {
      matcher: "/store/returns",
      methods: ["POST"],
      middlewares: [
        authenticate("customer", ["session", "bearer"], { allowUnauthenticated: true }),
        verifyOrderAccess,
      ],
    },

    // --- Store: cart completion
    // Email-verify gate. Guests pass through; account holders need
    // metadata.email_verified === true.
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

    // --- Store: email verification / accounts
    {
      matcher: "/store/auth/verify-email",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(StoreVerifyEmailSchema)],
    },
    {
      matcher: "/store/customers/email-exists",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(StoreEmailExistsSchema)],
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
