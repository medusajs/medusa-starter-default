import { hmacBase64Url, safeEqual } from "./hmac"

// Deterministic HMAC token used to authorize guest access to an order
// (confirmation page, links in order mails) without requiring login.
//
// Logged-in customers don't need this — ownership is checked via the
// customer JWT against `order.customer_id`. Deterministic on purpose: links
// in already-sent mails must keep working, so the format must not change.

export function signOrderToken(orderId: string): string {
  return hmacBase64Url(`order-token:${orderId}`)
}

export function verifyOrderToken(orderId: string, token: string): boolean {
  if (!orderId || !token || typeof token !== "string") return false
  return safeEqual(signOrderToken(orderId), token)
}
