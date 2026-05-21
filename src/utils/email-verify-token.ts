import crypto from "node:crypto"

// HMAC token for email verification. Bound to customer_id + email + issuance
// timestamp so an old token becomes invalid once the customer changes their
// address or the TTL elapses.
//
// Encoded as `<base64url(payload)>.<base64url(sig)>` where payload is
// `<customer_id>:<email>:<issuedAtMs>`.

const TTL_MS = 24 * 60 * 60 * 1000

function getSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error("JWT_SECRET is not configured")
  }
  return secret
}

function sign(payload: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(`email-verify:${payload}`)
    .digest("base64url")
}

function encodePayload(customerId: string, email: string, issuedAtMs: number): string {
  return Buffer.from(`${customerId}:${email.toLowerCase()}:${issuedAtMs}`).toString("base64url")
}

export function signEmailVerifyToken(
  customerId: string,
  email: string,
  issuedAtMs: number = Date.now(),
): string {
  const payload = encodePayload(customerId, email, issuedAtMs)
  const sig = sign(payload)
  return `${payload}.${sig}`
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
  if (parts.length !== 2) return { ok: false, reason: "malformed" }
  const [payload, sig] = parts

  const expected = sign(payload)
  if (expected.length !== sig.length) return { ok: false, reason: "signature" }
  let sigMatch = false
  try {
    sigMatch = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
  } catch {
    return { ok: false, reason: "signature" }
  }
  if (!sigMatch) return { ok: false, reason: "signature" }

  let decoded: string
  try {
    decoded = Buffer.from(payload, "base64url").toString("utf-8")
  } catch {
    return { ok: false, reason: "malformed" }
  }
  const [tokenCustomerId, tokenEmail, issuedAtRaw] = decoded.split(":")
  const issuedAtMs = Number(issuedAtRaw)
  if (!tokenCustomerId || !tokenEmail || !Number.isFinite(issuedAtMs)) {
    return { ok: false, reason: "malformed" }
  }
  if (tokenCustomerId !== customerId) return { ok: false, reason: "signature" }
  if (tokenEmail !== email.toLowerCase()) return { ok: false, reason: "signature" }
  if (Date.now() - issuedAtMs > maxAgeMs) return { ok: false, reason: "expired" }

  return { ok: true, customerId: tokenCustomerId, email: tokenEmail, issuedAtMs }
}
