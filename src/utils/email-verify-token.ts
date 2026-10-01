import { hmacBase64Url, safeEqual } from "./hmac"

// HMAC token for email verification. Bound to customer_id + email + issuance
// timestamp so an old token becomes invalid once the customer changes their
// address or the TTL elapses.
//
// Encoded as `<base64url(payload)>.<base64url(sig)>` where payload is
// `<customer_id>:<email>:<issuedAtMs>`. The format is unchanged from the
// first version so links already in inboxes stay valid.

const TTL_MS = 24 * 60 * 60 * 1000
// Tolerated clock skew for tokens "issued in the future" (multi-instance).
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000

function sign(payload: string): string {
  return hmacBase64Url(`email-verify:${payload}`)
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function encodePayload(customerId: string, email: string, issuedAtMs: number): string {
  return Buffer.from(
    `${customerId}:${normalizeEmail(email)}:${issuedAtMs}`,
  ).toString("base64url")
}

// customer ids never contain ":", the timestamp is the last segment, and
// everything in between is the email (which may itself contain ":").
function decodePayload(
  payload: string,
): { customerId: string; email: string; issuedAtMs: number } | null {
  const decoded = Buffer.from(payload, "base64url").toString("utf-8")
  const first = decoded.indexOf(":")
  const last = decoded.lastIndexOf(":")
  if (first <= 0 || last <= first) return null

  const customerId = decoded.slice(0, first)
  const email = decoded.slice(first + 1, last)
  const issuedAtRaw = decoded.slice(last + 1)
  if (!email || !/^\d+$/.test(issuedAtRaw)) return null

  return { customerId, email, issuedAtMs: Number(issuedAtRaw) }
}

export function signEmailVerifyToken(
  customerId: string,
  email: string,
  issuedAtMs: number = Date.now(),
): string {
  const payload = encodePayload(customerId, email, issuedAtMs)
  return `${payload}.${sign(payload)}`
}

export type VerifyResult =
  | { ok: true; customerId: string; email: string; issuedAtMs: number }
  | { ok: false; reason: "malformed" | "signature" | "expired" }

export function verifyEmailVerifyToken(
  customerId: string,
  email: string,
  token: string,
  maxAgeMs: number = TTL_MS,
): VerifyResult {
  if (!token || typeof token !== "string") return { ok: false, reason: "malformed" }
  const parts = token.split(".")
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, reason: "malformed" }
  }
  const [payload, sig] = parts

  if (!safeEqual(sign(payload), sig)) return { ok: false, reason: "signature" }

  const decoded = decodePayload(payload)
  if (!decoded) return { ok: false, reason: "malformed" }

  if (decoded.customerId !== customerId) return { ok: false, reason: "signature" }
  if (decoded.email !== normalizeEmail(email)) return { ok: false, reason: "signature" }

  const age = Date.now() - decoded.issuedAtMs
  if (age > maxAgeMs || age < -MAX_FUTURE_SKEW_MS) {
    return { ok: false, reason: "expired" }
  }

  return { ok: true, ...decoded }
}
