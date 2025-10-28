import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INVOICING_MODULE } from "../../../../../modules/invoicing"
import { Modules } from "@medusajs/framework/utils"
import { generateInvoicePdfWorkflow } from "../../../../../workflows/invoicing/generate-invoice-pdf"

interface RegenerateInvoicePdfRequest {
  regenerate?: boolean
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const invoicingService: any = req.scope.resolve(INVOICING_MODULE)
    const invoiceId = req.params.id
    const { download = false, preview = false } = req.query
    
    // Get invoice
    const invoice = await invoicingService.retrieveInvoice(invoiceId)
    
    if (!invoice) {
      return res.status(404).json({ 
        error: "Invoice not found",
        details: `Invoice with id ${invoiceId} does not exist`
      })
    }
    
    // Only generate PDF if explicitly requested (preview or download mode)
    if (preview === 'true' || download === 'true') {
      const { result } = await generateInvoicePdfWorkflow(req.scope).run({
        input: {
          invoice_id: invoiceId
        }
      })
      
      // Check if pdf_buffer exists
      if (!result.pdf_buffer) {
        throw new Error("PDF generation failed: no buffer returned")
      }
      
      // Convert array back to Buffer
      const pdfBuffer = Buffer.from(result.pdf_buffer)
      
      // Stream PDF directly (no disk storage needed)
      const filename = `invoice-${invoice.invoice_number}.pdf`

      // For download mode, send as attachment
      if (download === 'true') {
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      } else {
        // For preview mode, send as inline (opens in browser)
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`)
      }

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Length', pdfBuffer.length.toString())
      res.send(pdfBuffer)
    } else {
      // No preview or download requested
      return res.status(404).json({ 
        error: "PDF not available",
        details: "Please use preview=true or download=true to generate PDF"
      })
    }
  } catch (error) {
    console.error("Error handling invoice PDF:", error)
    res.status(500).json({ 
      error: "Failed to handle invoice PDF",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const invoiceId = req.params.id
    const { regenerate = false } = req.body as RegenerateInvoicePdfRequest
    
    // Always regenerate if specifically requested
    if (regenerate) {
      const { result } = await generateInvoicePdfWorkflow(req.scope).run({
        input: {
          invoice_id: invoiceId
        }
      })
      
      // Check if pdf_buffer exists
      if (!result.pdf_buffer) {
        throw new Error("PDF generation failed: no buffer returned")
      }
      
      // Convert array back to Buffer
      const pdfBuffer = Buffer.from(result.pdf_buffer)

      // Stream PDF directly as inline (no disk storage)
      const filename = `invoice-${result.invoice.invoice_number}.pdf`
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Length', pdfBuffer.length.toString())
      return res.send(pdfBuffer)
    }
    
    // Otherwise, use GET logic
    return GET(req, res)
  } catch (error) {
    console.error("Error regenerating invoice PDF:", error)
    res.status(500).json({ 
      error: "Failed to regenerate invoice PDF",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
} 