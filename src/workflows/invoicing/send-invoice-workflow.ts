import { createWorkflow, WorkflowResponse, transform } from "@medusajs/framework/workflows-sdk"
import { generateInvoicePdfStep } from "./steps/generate-invoice-pdf"
import { sendInvoiceEmailStep } from "./steps/send-invoice-email"
import { validateInvoiceStep } from "./steps/validate-invoice"
import { changeInvoiceStatusStep } from "./steps/change-invoice-status"

export interface SendInvoiceInput {
  invoice_id: string
  recipient_email?: string
  cc_emails?: string[]
  custom_message?: string
  language?: 'nl' | 'fr' | 'en'
}

export const sendInvoiceWorkflow = createWorkflow(
  "send-invoice",
  (input: SendInvoiceInput) => {
    // Step 1: Validate invoice can be sent
    validateInvoiceStep({ invoice_id: input.invoice_id })

    // Step 2: Generate PDF if not exists
    const pdf = generateInvoicePdfStep({
      invoice_id: input.invoice_id
    })

    // Step 3: Send email with PDF
    const emailResult = sendInvoiceEmailStep(
      transform({ input, pdf }, ({ input, pdf }) => ({
        invoice_id: input.invoice_id,
        recipient_email: input.recipient_email,
        cc_emails: input.cc_emails,
        custom_message: input.custom_message,
        language: input.language || 'nl',
        pdf_url: pdf.file.url
      }))
    )

    // Step 4: Change status to 'sent'
    const invoice = changeInvoiceStatusStep(
      transform({ input, emailResult }, ({ input, emailResult }) => ({
        invoice_id: input.invoice_id,
        new_status: 'sent',
        changed_by: 'system',
        reason: `Invoice sent to ${emailResult.sent_to}`
      }))
    )

    return new WorkflowResponse(
      transform({ invoice, emailResult, pdf }, ({ invoice, emailResult, pdf }) => ({
        invoice,
        email_sent_to: emailResult.sent_to,
        pdf_url: pdf.file.url
      }))
    )
  }
)
