import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { OFFER_MODULE } from "../../../../../modules/offers"
import { addLineItemToOfferWorkflow } from "../../../../../workflows/offers/add-line-item-workflow"

/**
 * GET /admin/offers/:id/line-items
 * List all line items for an offer
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const offerService: any = req.scope.resolve(OFFER_MODULE)
    const offerId = req.params.id

    // Get line items for the offer
    const lineItems = await offerService.listOfferLineItems(
      { offer_id: offerId },
      { order: { created_at: "ASC" } }
    )

    res.json({ line_items: lineItems })
  } catch (error) {
    console.error("Error fetching line items:", error)
    res.status(500).json({
      error: "Failed to fetch line items",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

/**
 * POST /admin/offers/:id/line-items
 * Add a line item to an offer (only for DRAFT offers)
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const offerId = req.params.id
    const {
      item_type,
      product_id,
      variant_id,
      title,
      description,
      sku,
      quantity,
      unit_price,
      discount_amount,
      tax_rate,
      notes,
      metadata
    } = req.body

    // Validate required fields
    if (!title || !quantity || unit_price === undefined) {
      return res.status(400).json({
        error: "Validation failed",
        details: "title, quantity, and unit_price are required"
      })
    }

    // Add line item via workflow (validates DRAFT status and recalculates totals)
    const { result } = await addLineItemToOfferWorkflow(req.scope).run({
      input: {
        offer_id: offerId,
        item_type,
        product_id,
        variant_id,
        title,
        description,
        sku,
        quantity: Number(quantity),
        unit_price: Number(unit_price),
        discount_amount: discount_amount ? Number(discount_amount) : 0,
        tax_rate: tax_rate ? Number(tax_rate) : 0,
        notes,
        metadata
      }
    })

    res.status(201).json({ line_item: result })
  } catch (error: any) {
    console.error("Error adding line item:", error)

    // Handle validation errors
    if (error.message?.includes("Cannot edit") || error.message?.includes("Only draft")) {
      return res.status(400).json({
        error: error.message,
      })
    }

    if (error.type === "not_found" || error.message?.includes("not found")) {
      return res.status(404).json({
        error: error.message || "Offer not found",
      })
    }

    res.status(500).json({
      error: "Failed to add line item",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}
