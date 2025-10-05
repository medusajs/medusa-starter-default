import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sendInvoiceWorkflow } from "../../../../../workflows/invoicing/send-invoice-workflow"

interface SendInvoiceRequest {
  recipient_email?: string
  cc_emails?: string[]
  custom_message?: string
  language?: 'nl' | 'fr' | 'en'
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const invoiceId = req.params.id
    const {
      recipient_email,
      cc_emails,
      custom_message,
      language = 'nl'
    } = req.body as SendInvoiceRequest

    const { result } = await sendInvoiceWorkflow(req.scope).run({
      input: {
        invoice_id: invoiceId,
        recipient_email,
        cc_emails,
        custom_message,
        language
      }
    })

    res.json({
      success: true,
      sent_to: result.email_sent_to,
      invoice: {
        id: result.invoice.id,
        invoice_number: result.invoice.invoice_number,
        status: result.invoice.status,
        sent_date: result.invoice.sent_date
      },
      pdf_url: result.pdf_url
    })
  } catch (error) {
    console.error("Error sending invoice:", error)
    res.status(500).json({
      error: "Failed to send invoice",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}
