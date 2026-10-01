import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  updateCustomersWorkflow,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows"

import { validateEmailVerifyCustomerStep } from "./steps/validate-email-verify-customer"
import { validateEmailVerifyTokenStep } from "./steps/validate-email-verify-token"

type WorkflowInput = {
  customer_id: string
  email: string
  token: string
}

// Token-based email verification: validates the HMAC token, asserts the
// customer still has the email the token was signed for, then sets
// `metadata.email_verified = true`.
//
// Only the flag is sent as metadata: the customer module merges metadata
// server-side (mergeMetadata in the same update), so concurrent changes to
// other metadata keys aren't overwritten. Idempotent.
export const verifyCustomerEmailWorkflow = createWorkflow(
  "verify-customer-email",
  function (input: WorkflowInput) {
    validateEmailVerifyTokenStep({
      customer_id: input.customer_id,
      email: input.email,
      token: input.token,
    })

    const { data: customers } = useQueryGraphStep({
      entity: "customer",
      fields: ["id", "email"],
      filters: { id: input.customer_id },
    })

    validateEmailVerifyCustomerStep({ customers, email: input.email })

    updateCustomersWorkflow.runAsStep({
      input: {
        selector: { id: input.customer_id },
        update: { metadata: { email_verified: true } },
      },
    })

    return new WorkflowResponse({ verified: true })
  },
)
