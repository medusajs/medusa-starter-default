import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { generateOfferPdfWorkflow } from "../../../../../workflows/offers/generate-offer-pdf-workflow"

/**
 * GET /admin/offers/:id/pdf
 * Generate and preview/download PDF for an offer
 * Supports preview=true (returns JSON with URL) or download=true (returns PDF buffer)
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const offerId = req.params.id
    const { download = false, preview = false } = req.query

    // Generate PDF via workflow
    const { result } = await generateOfferPdfWorkflow(req.scope).run({
      input: { offer_id: offerId }
    })

    // Check if pdf_buffer exists
    if (!result.pdf_buffer) {
      throw new Error("PDF generation failed: no buffer returned")
    }

    // Convert to Buffer (workflows serialize buffers as arrays)
    const pdfBuffer = Buffer.from(result.pdf_buffer)

    // Stream PDF directly (no disk storage needed)
    const filename = result.filename

    // For download mode, send as attachment
    if (download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    } else if (preview === 'true') {
      // For preview mode, send as inline (opens in browser)
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`)
    } else {
      // No preview or download requested
      return res.status(400).json({
        error: "Invalid request",
        details: "Please use preview=true or download=true query parameter"
      })
    }

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Length', pdfBuffer.length.toString())
    return res.send(pdfBuffer)
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
