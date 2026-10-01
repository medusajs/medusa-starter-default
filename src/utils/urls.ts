import { MedusaError } from "@medusajs/framework/utils"

import { signOrderToken } from "./order-token"

// Astro dev server default port
const DEV_STOREFRONT_URL = "http://localhost:4321"
const DEV_BACKEND_URL = "http://localhost:9000"

// Reads a base URL from the environment. In production a missing value is a
// hard error: silently mailing localhost links to customers is worse than a
// failed notification (which Medusa records and which shows up in the logs).
function baseUrlFromEnv(name: string, devFallback: string): string {
  const value = (process.env[name] || "").trim()
  if (value) return value.replace(/\/+$/, "")
  if (process.env.NODE_ENV === "production") {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `${name} is not set. Configure it so emails don't link to ${devFallback}.`,
    )
  }
  return devFallback
}

export function getStorefrontUrl(): string {
  return baseUrlFromEnv("STOREFRONT_URL", DEV_STOREFRONT_URL)
}

export function getBackendUrl(): string {
  return baseUrlFromEnv("MEDUSA_BACKEND_URL", DEV_BACKEND_URL)
}

// `${STOREFRONT_URL}/order/<id>?t=<token>` — the token is only honoured for
// guest orders (see verifyOrderAccess in api/middlewares.ts).
export function buildOrderUrl(orderId: string): string {
  return (
    `${getStorefrontUrl()}/order/${encodeURIComponent(orderId)}` +
    `?t=${encodeURIComponent(signOrderToken(orderId))}`
  )
}

// `${STOREFRONT_URL}/verify-email?customer_id=&email=&token=[&redirect=]`
export function buildVerifyUrl(input: {
  customerId: string
  email: string
  token: string
  redirect?: string
}): string {
  const params = new URLSearchParams({
    customer_id: input.customerId,
    email: input.email,
    token: input.token,
  })
  if (input.redirect) params.set("redirect", input.redirect)
  return `${getStorefrontUrl()}/verify-email?${params.toString()}`
}

// Customers land on the storefront (it only needs the token; email is just a
// prefill there, so it's left out of the URL). Admin users use the dashboard's
// built-in form, which expects token and email.
export function buildPasswordResetUrl(input: {
  actorType: string
  token: string
  email: string
}): string {
  if (input.actorType === "customer") {
    return `${getStorefrontUrl()}/reset-password?token=${encodeURIComponent(input.token)}`
  }
  const params = new URLSearchParams({ token: input.token, email: input.email })
  return `${getBackendUrl()}/app/reset-password?${params.toString()}`
}
