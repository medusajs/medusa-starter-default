import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { changeOfferStatusWorkflow } from "../../../../../workflows/offers/change-offer-status-workflow"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * POST /admin/offers/:id/status
 * Change the status of an offer with validation
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const offerId = req.params.id
    const { status, reason } = req.body

    // Validate required fields
    if (!status) {
      return res.status(400).json({
        error: "Validation failed",
        details: "status is required"
      })
    }

    // Change status via workflow (validates status transition)
    const { result } = await changeOfferStatusWorkflow(req.scope).run({
      input: {
        offer_id: offerId,
        new_status: status,
        changed_by: (req as any).user?.id || "admin",
        reason
      }
    })

    // Return updated offer with relationships
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: [updatedOffer] } = await query.graph({
      entity: "offer",
      fields: [
        "*",
        "line_items.*",
        "status_history.*",
      ],
      filters: {
        id: offerId,
      },
    })

    res.json({ offer: updatedOffer })
  } catch (error: any) {
    console.error("Error changing offer status:", error)

    // Handle validation errors
    if (error.type === "invalid_data" || error.message?.includes("Invalid status transition")) {
      return res.status(400).json({
        error: "Invalid status transition",
        details: error.message
      })
    }

    if (error.type === "not_found" || error.message?.includes("not found")) {
      return res.status(404).json({
        error: "Offer not found",
        details: `Offer with id ${offerId} does not exist`
      })
    }

    res.status(500).json({
      error: "Failed to change offer status",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}
