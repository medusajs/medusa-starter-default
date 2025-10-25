import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { OFFER_MODULE } from "../../../../modules/offers"

/**
 * GET /admin/offers/analytics
 * Get analytics data for offers (total count, amounts, status breakdown, conversion rate)
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const offerService: any = req.scope.resolve(OFFER_MODULE)

    // Get analytics with optional filters from query params
    const analytics = await offerService.getOfferAnalytics(req.query)

    res.json({ analytics })
  } catch (error) {
    console.error("Error fetching offer analytics:", error)
    res.status(500).json({
      error: "Failed to fetch offer analytics",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}
