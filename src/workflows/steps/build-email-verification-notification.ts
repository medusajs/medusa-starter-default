import type { CreateNotificationDTO } from "@medusajs/framework/types"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"

import { signEmailVerifyToken } from "../../utils/email-verify-token"
import { buildVerifyUrl } from "../../utils/urls"

export type EmailVerificationCustomer = {
  id: string
  email?: string | null
  first_name?: string | null
  has_account?: boolean | null
  metadata?: Record<string, unknown> | null
}

export type BuildEmailVerificationNotificationInput = {
  customers: EmailVerificationCustomer[]
  // Store/subscriber flows skip already-verified customers; admin resends always.
  skip_if_verified?: boolean
  idempotency_key?: string
  redirect?: string
}

// Signs a fresh verify token for the customer and builds the "email-verify"
// notification. Returns an empty list when there's nothing to send.
export const buildEmailVerificationNotificationStep = createStep(
  "build-email-verification-notification",
  async (input: BuildEmailVerificationNotificationInput) => {
    const customer = input.customers[0]
    if (!customer?.email) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Customer not found")
    }
    if (!customer.has_account) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Customer is a guest and has no account to verify",
      )
    }

    const notifications: CreateNotificationDTO[] = []
    if (input.skip_if_verified && customer.metadata?.email_verified === true) {
      return new StepResponse(notifications)
    }

    const token = signEmailVerifyToken(customer.id, customer.email)
    notifications.push({
      to: customer.email,
      channel: "email",
      template: "email-verify",
      data: {
        email: customer.email,
        verify_url: buildVerifyUrl({
          customerId: customer.id,
          email: customer.email,
          token,
          redirect: input.redirect,
        }),
        customer: { first_name: customer.first_name ?? "" },
      },
      resource_type: "customer",
      resource_id: customer.id,
      receiver_id: customer.id,
      idempotency_key: input.idempotency_key ?? null,
    })

    return new StepResponse(notifications)
  },
)
