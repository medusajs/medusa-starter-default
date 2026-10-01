import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  sendNotificationsStep,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows"

import { buildEmailVerificationNotificationStep } from "./steps/build-email-verification-notification"

export type SendEmailVerificationWorkflowInput = {
  customer_id: string
  // true for signup/store resend: already-verified customers get no mail.
  skip_if_verified?: boolean
  // Set for one-shot triggers (signup). Leave unset for user-initiated
  // resends — a reused key would make the notification module skip them.
  idempotency_key?: string
  redirect?: string
}

// Sends the "email-verify" mail: load customer -> sign token + build
// notification -> send. Used by the customer.created subscriber and both
// resend routes (store + admin).
export const sendEmailVerificationWorkflow = createWorkflow(
  "send-email-verification",
  function (input: SendEmailVerificationWorkflowInput) {
    const { data: customers } = useQueryGraphStep({
      entity: "customer",
      fields: ["id", "email", "first_name", "has_account", "metadata"],
      filters: { id: input.customer_id },
    })

    const notifications = buildEmailVerificationNotificationStep({
      customers,
      skip_if_verified: input.skip_if_verified,
      idempotency_key: input.idempotency_key,
      redirect: input.redirect,
    })

    const sent = sendNotificationsStep(notifications)

    const result = transform({ sent }, ({ sent }) => ({
      sent: sent.length > 0,
    }))

    return new WorkflowResponse(result)
  },
)
