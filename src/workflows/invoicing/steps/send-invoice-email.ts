import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules, MedusaError } from "@medusajs/framework/utils"
import { INVOICING_MODULE } from "../../../modules/invoicing"

type SendInvoiceEmailInput = {
  invoice_id: string
  recipient_email?: string
  cc_emails?: string[]
  custom_message?: string
  language: 'nl' | 'fr' | 'en'
  pdf_url: string
}

export const sendInvoiceEmailStep = createStep(
  "send-invoice-email",
  async (input: SendInvoiceEmailInput, { container }) => {
    const invoicingService = container.resolve(INVOICING_MODULE)
    const notificationService = container.resolve(Modules.NOTIFICATION)

    const invoice = await invoicingService.retrieveInvoice(input.invoice_id)

    const recipientEmail = input.recipient_email || invoice.customer_email

    // Email templates by language
    const templates = {
      nl: {
        subject: `Factuur ${invoice.invoice_number}`,
        body: `Beste,

Hierbij ontvangt u factuur ${invoice.invoice_number} voor een totaalbedrag van €${invoice.total_amount}.

${input.custom_message || ''}

Betaaltermijn: ${invoice.payment_terms || '30 dagen'}
Vervaldatum: ${new Date(invoice.due_date).toLocaleDateString('nl-BE')}

Met vriendelijke groet`
      },
      fr: {
        subject: `Facture ${invoice.invoice_number}`,
        body: `Cher client,

Veuillez trouver ci-joint la facture ${invoice.invoice_number} d'un montant total de €${invoice.total_amount}.

${input.custom_message || ''}

Conditions de paiement: ${invoice.payment_terms || '30 jours'}
Date d'échéance: ${new Date(invoice.due_date).toLocaleDateString('fr-BE')}

Cordialement`
      },
      en: {
        subject: `Invoice ${invoice.invoice_number}`,
        body: `Dear customer,

Please find attached invoice ${invoice.invoice_number} for a total amount of €${invoice.total_amount}.

${input.custom_message || ''}

Payment terms: ${invoice.payment_terms || '30 days'}
Due date: ${new Date(invoice.due_date).toLocaleDateString('en-BE')}

Best regards`
      }
    }

    const template = templates[input.language]

    try {
      // Using MedusaJS notification module
      await notificationService.createNotifications({
        to: recipientEmail,
        channel: "email",
        template: "invoice-email",
        data: {
          subject: template.subject,
          body: template.body,
          invoice_number: invoice.invoice_number,
          pdf_url: input.pdf_url,
          cc: input.cc_emails,
        },
      })

      return new StepResponse({
        sent_to: recipientEmail,
        sent_at: new Date()
      })
    } catch (error: any) {
      console.error("Failed to send invoice email:", error)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to send invoice email: ${error.message}`
      )
    }
  }
)
