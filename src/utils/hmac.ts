import crypto from "node:crypto"
import { MedusaError } from "@medusajs/framework/utils"

// Shared HMAC helpers for the order and email-verify tokens. Both are keyed
// with JWT_SECRET, so rotating it invalidates every link already sent.
function getSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "JWT_SECRET is not configured",
    )
  }
  return secret
}

export function hmacBase64Url(value: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(value)
    .digest("base64url")
}

// Constant-time string comparison; unequal lengths fail fast (length is not secret).
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}
