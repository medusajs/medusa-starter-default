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

type WorkflowInput = {
  customer_id: string
  verified: boolean
}

// Admin-driven override of the email-verified flag. Used when a support
// agent confirms the user's identity out-of-band (phone, chat) and wants
// to unblock the checkout without forcing them through the mail roundtrip.
// Setting `verified: false` is also supported — useful if an automatic
// verification was triggered by mistake.
export const setCustomerEmailVerifiedWorkflow = createWorkflow(
  "set-customer-email-verified",
  (input: WorkflowInput) => {
    const { data: customers } = useQueryGraphStep({
      entity: "customer",
      fields: ["id", "metadata"],
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
        const existing = (customer.metadata as Record<string, unknown> | null) ?? {}
        return {
          selector: { id: customer.id },
          update: {
            metadata: { ...existing, email_verified: data.input.verified },
          },
        }
      },
    )

    updateCustomersWorkflow.runAsStep({ input: updatePayload })

    return new WorkflowResponse({ verified: input.verified })
  },
)
