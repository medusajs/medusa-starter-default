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

    // For download mode, send as attachment
    if (download === 'true') {
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': pdfBuffer.length.toString()
      })
      return res.send(pdfBuffer)
    }

    // For preview mode, save temporarily and return URL
    if (preview === 'true') {
      const fs = require('fs')
      const path = require('path')

      // Generate a temporary filename
      const tempFilename = `private-${Date.now()}-${result.filename}`
      const staticDir = path.join(process.cwd(), 'static')

      // Ensure static directory exists
      if (!fs.existsSync(staticDir)) {
        fs.mkdirSync(staticDir, { recursive: true })
      }

      const tempFilePath = path.join(staticDir, tempFilename)
      fs.writeFileSync(tempFilePath, pdfBuffer)

      // Return URL to the temporary file
      return res.json({
        file: {
          id: tempFilename,
          url: `/static/${tempFilename}`,
          filename: result.filename,
          content_type: 'application/pdf'
        },
        offer: {
          id: result.offer.id,
          offer_number: result.offer.offer_number,
          status: result.offer.status,
          total_amount: result.offer.total_amount,
          currency_code: result.offer.currency_code
        }
      })
    }

    // No preview or download requested
    return res.status(400).json({
      error: "Invalid request",
      details: "Please use preview=true or download=true query parameter"
    })
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
