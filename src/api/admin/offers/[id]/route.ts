import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { OFFER_MODULE } from "../../../../modules/offers"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateOfferWorkflow } from "../../../../workflows/offers/update-offer-workflow"
import { deleteOfferWorkflow } from "../../../../workflows/offers/delete-offer-workflow"

/**
 * GET /admin/offers/:id
 * Get a single offer with full details including line items and status history
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const offerId = req.params.id

    // Get offer with full details using Remote Query
    const { data: [offer] } = await query.graph({
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

    if (!offer) {
      return res.status(404).json({
        error: "Offer not found",
        details: `Offer with id ${offerId} does not exist`
      })
    }

    res.json({ offer })
  } catch (error) {
    console.error("Error fetching offer:", error)
    res.status(500).json({
      error: "Failed to fetch offer",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

/**
 * PATCH /admin/offers/:id
 * Update offer details (only for DRAFT offers)
 */
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  try {
    const offerId = req.params.id
    const {
      customer_email,
      customer_phone,
      valid_until,
      billing_address,
      shipping_address,
      notes,
      terms_and_conditions,
      metadata
    } = req.body

    // Update offer via workflow (validates DRAFT status)
    const { result } = await updateOfferWorkflow(req.scope).run({
      input: {
        offer_id: offerId,
        customer_email,
        customer_phone,
        valid_until: valid_until ? new Date(valid_until) : undefined,
        billing_address,
        shipping_address,
        notes,
        terms_and_conditions,
        metadata
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
    console.error("Error updating offer:", error)

    // Handle validation errors from workflow
    if (error.type === "not_found" || error.message?.includes("not found")) {
      return res.status(404).json({
        error: error.message || "Offer not found",
      })
    }

    if (error.type === "invalid_data" || error.message?.includes("Cannot edit")) {
      return res.status(400).json({
        error: error.message || "Invalid data",
      })
    }

    res.status(500).json({
      error: "Failed to update offer",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

/**
 * DELETE /admin/offers/:id
 * Delete an offer (only DRAFT offers can be deleted)
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const offerId = req.params.id

    // Use workflow for safe deletion with cascade
    const { result } = await deleteOfferWorkflow(req.scope).run({
      input: {
        offer_id: offerId,
      }
    })

    res.json({
      success: true,
      message: `Offer deleted successfully`,
      offer_id: result.offer_id
    })
  } catch (error: any) {
    console.error("Error deleting offer:", error)

    // Handle specific error types
    if (error.message?.includes("Only draft offers") || error.message?.includes("Cannot delete")) {
      return res.status(400).json({
        error: "Cannot delete offer",
        details: "Only draft offers can be deleted"
      })
    }

    if (error.type === "not_found" || error.message?.includes("not found")) {
      return res.status(404).json({
        error: "Offer not found",
        details: `Offer with id ${offerId} does not exist`
      })
    }

    res.status(500).json({
      error: "Failed to delete offer",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}
