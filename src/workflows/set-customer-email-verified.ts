import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  updateCustomersWorkflow,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows"

import { validateEmailVerifyCustomerStep } from "./steps/validate-email-verify-customer"

type WorkflowInput = {
  customer_id: string
  verified: boolean
}

// Admin-driven override of the email-verified flag. Used when a support
// agent confirms the user's identity out-of-band (phone, chat) and wants
// to unblock the checkout without forcing them through the mail roundtrip.
// Setting `verified: false` is also supported — useful if an automatic
// verification was triggered by mistake.
//
// Only the flag is sent; the customer module merges it into the existing
// metadata server-side, so no read-merge-write race on other keys.
export const setCustomerEmailVerifiedWorkflow = createWorkflow(
  "set-customer-email-verified",
  function (input: WorkflowInput) {
    const { data: customers } = useQueryGraphStep({
      entity: "customer",
      fields: ["id", "email"],
      filters: { id: input.customer_id },
    })

    validateEmailVerifyCustomerStep({ customers })

    updateCustomersWorkflow.runAsStep({
      input: {
        selector: { id: input.customer_id },
        update: { metadata: { email_verified: input.verified } },
      },
    })

    return new WorkflowResponse({ verified: input.verified })
  },
)
