import { createWorkflow, WorkflowResponse, transform } from "@medusajs/framework/workflows-sdk"
import { validateStatusTransitionStep } from "./steps/validate-status-transition"
import { generateOfferPdfWorkflow } from "./generate-offer-pdf-workflow"
import { sendOfferEmailStep } from "./steps/send-offer-email"
import { changeOfferStatusStep } from "./steps/change-offer-status"

export type SendOfferInput = {
  offer_id: string
  recipient_email?: string
  subject?: string
  message?: string
}

/**
 * Workflow to send an offer via email with PDF attachment
 * 1. Validates status transition (DRAFT → SENT)
 * 2. Generates PDF using nested workflow
 * 3. Sends email with PDF attachment
 * 4. Changes status to SENT
 */
export const sendOfferWorkflow = createWorkflow(
  "send-offer",
  (input: SendOfferInput) => {
    // Step 1: Validate status transition (DRAFT → SENT)
    validateStatusTransitionStep({
      offer_id: input.offer_id,
      new_status: 'sent',
    })

    // Step 2: Generate PDF using nested workflow
    const pdf = generateOfferPdfWorkflow.runAsStep({
      input: {
        offer_id: input.offer_id,
      },
    })

    // Step 3: Send email with PDF attachment
    const emailResult = sendOfferEmailStep(
      transform({ input, pdf }, ({ input, pdf }) => ({
        offer_id: input.offer_id,
        recipient_email: input.recipient_email,
        subject: input.subject,
        message: input.message,
        pdf_buffer: pdf.buffer,
        pdf_filename: pdf.filename,
      }))
    )

    // Step 4: Change status to SENT (handled within sendOfferEmailStep)
    // The status is already changed by the sendOfferEmailStep

    return new WorkflowResponse(
      transform({ emailResult, pdf }, ({ emailResult, pdf }) => ({
        sent: emailResult.sent,
        recipient: emailResult.recipient,
        offer_number: emailResult.offer_number,
        sent_at: emailResult.sent_at,
        pdf_filename: pdf.filename,
      }))
    )
  }
)
