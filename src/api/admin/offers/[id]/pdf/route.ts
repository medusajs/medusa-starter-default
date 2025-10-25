import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { generateOfferPdfWorkflow } from "../../../../../workflows/offers/generate-offer-pdf-workflow"

/**
 * GET /admin/offers/:id/pdf
 * Generate and download PDF for an offer
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const offerId = req.params.id

    // Generate PDF via workflow
    const { result } = await generateOfferPdfWorkflow(req.scope).run({
      input: { offer_id: offerId }
    })

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`)

    // Send PDF buffer
    return res.send(result.buffer)
  } catch (error: any) {
    console.error("Error generating PDF:", error)

    if (error.type === "not_found" || error.message?.includes("not found")) {
      return res.status(404).json({
        error: "Offer not found",
        details: `Offer with id ${req.params.id} does not exist`
      })
    }

    res.status(500).json({
      error: "Failed to generate PDF",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}
