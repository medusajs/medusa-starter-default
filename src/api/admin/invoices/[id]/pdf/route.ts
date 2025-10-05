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
    const fileService = req.scope.resolve(Modules.FILE)
    const invoiceId = req.params.id
    const { download = false, preview = false } = req.query
    
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
      const { result } = await generateInvoicePdfWorkflow(req.scope).run({
        input: {
          invoice_id: invoiceId
        }
      })
      
      fileId = result.file.id
    }
    
    // If we have an order_id and the documents plugin generated a PDF
    if (invoice.order_id) {
      const documentsService = req.scope.resolve("documentsModuleService")
      
      try {
        // For download mode, use the plugin's direct PDF endpoint
        if (download === 'true') {
          return res.redirect(`/admin/orders/${invoice.order_id}/invoice/pdf`)
        }
        
        // For preview mode, return the plugin's PDF URL
        res.json({ 
          file: {
            id: invoice.pdf_file_id || `invoice-${invoice.id}`,
            url: `/admin/orders/${invoice.order_id}/invoice/pdf`,
            filename: `factuur-${invoice.invoice_number}.pdf`,
            content_type: 'application/pdf'
          },
          invoice: {
            id: invoice.id,
            invoice_number: invoice.invoice_number,
            status: invoice.status,
            total_amount: invoice.total_amount,
            currency_code: invoice.currency_code
          }
        })
        return
      } catch (documentsError) {
        console.warn("Could not use documents plugin, falling back:", documentsError.message)
      }
    }

    // Fallback: Check if we have a generated file
    if (fileId) {
      // Get file details
      const file = await fileService.retrieveFile(fileId)
      
      // For download mode, trigger actual file download
      if (download === 'true') {
        res.setHeader('Content-Disposition', `attachment; filename="factuur-${invoice.invoice_number}.pdf"`)
        res.setHeader('Content-Type', 'application/pdf')
        
        // Fetch file content and send as stream
        const fileResponse = await fetch(file.url)
        const fileBuffer = await fileResponse.arrayBuffer()
        
        res.send(Buffer.from(fileBuffer))
        return
      }
      
      // For preview mode or regular API call, return file info
      res.json({ 
        file: {
          id: file.id,
          url: file.url,
          filename: `factuur-${invoice.invoice_number}.pdf`,
          content_type: 'application/pdf'
        },
        invoice: {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          status: invoice.status,
          total_amount: invoice.total_amount,
          currency_code: invoice.currency_code
        }
      })
    } else {
      // No file available
      return res.status(404).json({ 
        error: "PDF not available",
        details: "Invoice PDF has not been generated yet"
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
      
      return res.json({ 
        file: {
          id: result.file.id,
          url: result.file.url,
          filename: `factuur-${result.invoice.invoice_number}.pdf`
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