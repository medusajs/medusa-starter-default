import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { INVOICING_MODULE } from "../../../../../modules/invoicing"
import { generateInvoicePdfStep } from "../../../../../workflows/invoicing/steps/generate-invoice-pdf"
import { Modules } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const invoicingService: any = req.scope.resolve(INVOICING_MODULE)
    const fileService = req.scope.resolve(Modules.FILE)
    const invoiceId = req.params.id
    
    // Get invoice to check if PDF already exists
    const invoice = await invoicingService.retrieveInvoice(invoiceId)
    
    if (!invoice) {
      return res.status(404).json({ 
        error: "Invoice not found",
        details: `Invoice with id ${invoiceId} does not exist`
      })
    }
    
    let fileId = invoice.pdf_file_id
    
    // Generate PDF if it doesn't exist
    if (!fileId) {
      const { result } = await generateInvoicePdfStep.invoke({
        invoice_id: invoiceId
      }, { container: req.scope })
      
      fileId = result.file.id
    }
    
    // Get file details
    const file = await fileService.retrieveFile(fileId)
    
    // Return file URL for download
    res.json({ 
      file: {
        id: file.id,
        url: file.url,
        filename: `invoice-${invoice.invoice_number}.html`
      }
    })
  } catch (error) {
    console.error("Error generating invoice PDF:", error)
    res.status(500).json({ 
      error: "Failed to generate invoice PDF",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const invoiceId = req.params.id
    const { regenerate = false } = req.body
    
    // Always regenerate if specifically requested
    if (regenerate) {
      const { result } = await generateInvoicePdfStep.invoke({
        invoice_id: invoiceId
      }, { container: req.scope })
      
      return res.json({ 
        file: {
          id: result.file.id,
          url: result.file.url,
          filename: `invoice-${result.invoice.invoice_number}.html`
        },
        regenerated: true
      })
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