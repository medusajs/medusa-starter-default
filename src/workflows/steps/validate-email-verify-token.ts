import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"

import { verifyEmailVerifyToken } from "../../utils/email-verify-token"

export type ValidateEmailVerifyTokenInput = {
  customer_id: string
  email: string
  token: string
}

// Validates the HMAC verification token against (customer_id, email).
// Throws MedusaError on failure so the workflow aborts before any mutation.
export const validateEmailVerifyTokenStep = createStep(
  "validate-email-verify-token",
  async ({ customer_id, email, token }: ValidateEmailVerifyTokenInput) => {
    const result = verifyEmailVerifyToken(customer_id, email, token)
    if (!result.ok) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        result.reason === "expired"
          ? "Verification link has expired"
          : "Invalid verification token",
      )
    }
    return new StepResponse(result)
  },
)
