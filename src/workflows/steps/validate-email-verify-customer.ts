import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"

export type EmailVerifyCustomer = {
  id: string
  email?: string | null
}

export type ValidateEmailVerifyCustomerInput = {
  customers: EmailVerifyCustomer[]
  // When set, the customer's current email must still match it.
  email?: string
}

// Asserts the customer exists (and optionally that its email still matches
// the one a verify token was issued for). Throws so the workflow aborts
// before any mutation.
export const validateEmailVerifyCustomerStep = createStep(
  "validate-email-verify-customer",
  async ({ customers, email }: ValidateEmailVerifyCustomerInput) => {
    const customer = customers[0]
    if (!customer) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Customer not found")
    }

    // Defense-in-depth: the token is bound to the email, but if the address
    // changed after issuance the stored email no longer matches.
    if (
      email !== undefined &&
      customer.email?.trim().toLowerCase() !== email.trim().toLowerCase()
    ) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Email no longer matches",
      )
    }

    return new StepResponse({ customer_id: customer.id })
  },
)
