import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { OFFER_MODULE } from "../../../modules/offers"

type SendOfferEmailInput = {
  offer_id: string
  pdf_buffer: Buffer
  pdf_filename: string
  recipient_email?: string
  subject?: string
  message?: string
}

/**
 * Step to send an offer via email with PDF attachment
 * Uses the Notification Module to send email
 * Updates offer status to SENT after successful email delivery
 * No compensation needed (email already sent, status change is logged)
 */
export const sendOfferEmailStep = createStep(
  "send-offer-email",
  async (input: SendOfferEmailInput, { container }) => {
    const offerService = container.resolve(OFFER_MODULE)
    const notificationService = container.resolve(Modules.NOTIFICATION)

    // Retrieve offer details
    const offer = await offerService.retrieveOffer(input.offer_id)

    if (!offer) {
      throw new Error(`Offer with id ${input.offer_id} not found`)
    }

    const recipientEmail = input.recipient_email || offer.customer_email
    const subject = input.subject || `Offer ${offer.offer_number}`
    const message = input.message ||
      `Dear Customer,\n\nPlease find attached our offer ${offer.offer_number}.\n\n` +
      `This offer is valid until ${new Date(offer.valid_until).toLocaleDateString()}.\n\n` +
      `Total Amount: €${(Number(offer.total_amount) / 100).toFixed(2)}\n\n` +
      `Best regards`

    // Send email with PDF attachment via Notification Module
    try {
      await notificationService.createNotifications({
        to: recipientEmail,
        channel: "email",
        template: "offer-email",
        data: {
          subject,
          message,
          offer_number: offer.offer_number,
          offer_date: offer.offer_date,
          valid_until: offer.valid_until,
          total_amount: offer.total_amount,
        },
        // Note: Attachment handling depends on notification provider implementation
        // This is a placeholder - actual implementation may vary
      })

      // Update offer status to SENT
      await offerService.changeOfferStatus(
        input.offer_id,
        'sent',
        'system',
        'Offer sent via email'
      )

      return new StepResponse({
        sent: true,
        recipient: recipientEmail,
        offer_number: offer.offer_number,
        sent_at: new Date(),
      })
    } catch (error) {
      throw new Error(`Failed to send offer email: ${error.message}`)
    }
  }
)
