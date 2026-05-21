import crypto from "node:crypto"

// Deterministic HMAC token used to authorize guest access to a freshly
// created order (post-checkout confirmation page) without requiring login.
//
// Logged-in customers don't need this — ownership is checked via the
// customer JWT against `order.customer_id`. The token only matters for
// guest checkouts where there is no customer record on the order.

function getSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error("JWT_SECRET is not configured")
  }
  return secret
}

export function signOrderToken(orderId: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(`order-token:${orderId}`)
    .digest("base64url")
}

export function verifyOrderToken(orderId: string, token: string): boolean {
  if (!token || typeof token !== "string") return false
  const expected = signOrderToken(orderId)
  if (expected.length !== token.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token))
  } catch {
    return false
  }
}
