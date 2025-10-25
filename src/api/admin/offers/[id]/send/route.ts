import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sendOfferWorkflow } from "../../../../../workflows/offers/send-offer-workflow"

/**
 * POST /admin/offers/:id/send
 * Send an offer via email with PDF attachment
 * Changes status from DRAFT to SENT
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const offerId = req.params.id
    const {
      recipient_email,
      subject,
      message
    } = req.body

    // Send offer via workflow (validates DRAFT status, generates PDF, sends email, updates status)
    const { result } = await sendOfferWorkflow(req.scope).run({
      input: {
        offer_id: offerId,
        recipient_email,
        subject,
        message
      }
    })

    res.json({
      success: true,
      sent: result.sent,
      recipient: result.recipient,
      offer_number: result.offer_number,
      sent_at: result.sent_at
    })
  } catch (error: any) {
    console.error("Error sending offer:", error)

    // Handle validation errors
    if (error.message?.includes("Invalid status transition") || error.message?.includes("Cannot change from")) {
      return res.status(400).json({
        error: "Cannot send offer",
        details: error.message
      })
    }

    if (error.type === "not_found" || error.message?.includes("not found")) {
      return res.status(404).json({
        error: "Offer not found",
        details: `Offer with id ${offerId} does not exist`
      })
    }

    if (error.message?.includes("Failed to send")) {
      return res.status(500).json({
        error: "Email delivery failed",
        details: error.message
      })
    }

    res.status(500).json({
      error: "Failed to send offer",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}
