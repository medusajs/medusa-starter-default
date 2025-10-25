import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { OFFER_MODULE } from "../../../../../modules/offers"

/**
 * GET /admin/offers/customer/:customer_id
 * Get all offers for a specific customer with line items and status history
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const offerService: any = req.scope.resolve(OFFER_MODULE)
    const customerId = req.params.customer_id

    // Get customer's offer history
    const offers = await offerService.getCustomerOfferHistory(customerId)

    res.json({
      offers,
      count: offers.length,
      customer_id: customerId
    })
  } catch (error) {
    console.error("Error fetching customer offer history:", error)
    res.status(500).json({
      error: "Failed to fetch customer offer history",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}
