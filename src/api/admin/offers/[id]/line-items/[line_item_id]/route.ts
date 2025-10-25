import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateLineItemWorkflow } from "../../../../../../workflows/offers/update-line-item-workflow"
import { deleteLineItemWorkflow } from "../../../../../../workflows/offers/delete-line-item-workflow"

/**
 * PATCH /admin/offers/:id/line-items/:line_item_id
 * Update a line item in an offer (only for DRAFT offers)
 */
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id: offerId, line_item_id: lineItemId } = req.params
    const {
      title,
      description,
      quantity,
      unit_price,
      discount_amount,
      tax_rate,
      notes
    } = req.body

    // Update line item via workflow (validates DRAFT status and recalculates totals)
    const { result } = await updateLineItemWorkflow(req.scope).run({
      input: {
        line_item_id: lineItemId,
        offer_id: offerId,
        title,
        description,
        quantity: quantity !== undefined ? Number(quantity) : undefined,
        unit_price: unit_price !== undefined ? Number(unit_price) : undefined,
        discount_amount: discount_amount !== undefined ? Number(discount_amount) : undefined,
        tax_rate: tax_rate !== undefined ? Number(tax_rate) : undefined,
        notes
      }
    })

    res.json({ line_item: result })
  } catch (error: any) {
    console.error("Error updating line item:", error)

    // Handle validation errors
    if (error.message?.includes("Cannot edit") || error.message?.includes("Only draft")) {
      return res.status(400).json({
        error: error.message,
      })
    }

    if (error.type === "not_found" || error.message?.includes("not found")) {
      return res.status(404).json({
        error: error.message || "Line item or offer not found",
      })
    }

    res.status(500).json({
      error: "Failed to update line item",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

/**
 * DELETE /admin/offers/:id/line-items/:line_item_id
 * Delete a line item from an offer (only for DRAFT offers)
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id: offerId, line_item_id: lineItemId } = req.params

    // Delete line item via workflow (validates DRAFT status and recalculates totals)
    const { result } = await deleteLineItemWorkflow(req.scope).run({
      input: {
        line_item_id: lineItemId,
        offer_id: offerId
      }
    })

    res.json({
      success: true,
      message: "Line item deleted successfully"
    })
  } catch (error: any) {
    console.error("Error deleting line item:", error)

    // Handle validation errors
    if (error.message?.includes("Cannot edit") || error.message?.includes("Only draft")) {
      return res.status(400).json({
        error: error.message,
      })
    }

    if (error.type === "not_found" || error.message?.includes("not found")) {
      return res.status(404).json({
        error: error.message || "Line item or offer not found",
      })
    }

    res.status(500).json({
      error: "Failed to delete line item",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}
