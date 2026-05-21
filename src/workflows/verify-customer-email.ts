import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  updateCustomersWorkflow,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows"
import { MedusaError } from "@medusajs/framework/utils"

import { validateEmailVerifyTokenStep } from "./steps/validate-email-verify-token"

type WorkflowInput = {
  customer_id: string
  email: string
  token: string
}

// Token-based email verification. Looks up the customer, asserts the email
// the caller signed for still matches, then flips `metadata.email_verified`
// to true via the built-in updateCustomersWorkflow.
//
// Idempotent: if the customer is already verified the workflow no-ops by
// merging the same flag again.
export const verifyCustomerEmailWorkflow = createWorkflow(
  "verify-customer-email",
  (input: WorkflowInput) => {
    validateEmailVerifyTokenStep({
      customer_id: input.customer_id,
      email: input.email,
      token: input.token,
    })

    const { data: customers } = useQueryGraphStep({
      entity: "customer",
      fields: ["id", "email", "has_account", "metadata"],
      filters: { id: input.customer_id },
    })

    const updatePayload = transform(
      { customers, input },
      (data) => {
        const customer = data.customers[0]
        if (!customer) {
          throw new MedusaError(
            MedusaError.Types.NOT_FOUND,
            "Customer not found",
          )
        }
        // Defense-in-depth: token is bound to email, but if the address was
        // changed after issuance and the token was reused, the lookup-email
        // can drift. Reject early.
        if (customer.email?.toLowerCase() !== data.input.email.toLowerCase()) {
          throw new MedusaError(
            MedusaError.Types.NOT_ALLOWED,
            "Email no longer matches",
          )
        }
        const existing = (customer.metadata as Record<string, unknown> | null) ?? {}
        return {
          selector: { id: customer.id },
          update: {
            metadata: { ...existing, email_verified: true },
          },
        }
      },
    )

    updateCustomersWorkflow.runAsStep({ input: updatePayload })

    return new WorkflowResponse({ verified: true })
  },
)
