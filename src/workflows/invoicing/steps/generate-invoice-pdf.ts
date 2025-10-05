import { 
  createStep, 
  StepResponse 
} from "@medusajs/framework/workflows-sdk"
import { 
  Modules,
  ContainerRegistrationKeys 
} from "@medusajs/framework/utils"
import { INVOICING_MODULE } from "../../../modules/invoicing"

type GenerateInvoicePdfInput = {
  invoice_id: string
}

export const generateInvoicePdfStep = createStep(
  "generate-invoice-pdf",
  async (input: GenerateInvoicePdfInput, { container }) => {
    const invoicingService = container.resolve(INVOICING_MODULE)
    const documentsService = container.resolve("documentsModuleService")
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    
    // Get invoice details
    const { data: [invoiceData] } = await query.graph({
      entity: "invoice",
      fields: [
        "id",
        "invoice_number",
        "order_id",
        "customer_id",
        "total_amount",
        "currency_code",
      ],
      filters: {
        id: input.invoice_id,
      },
    })
    
    if (!invoiceData) {
      throw new Error(`Invoice ${input.invoice_id} not found`)
    }

    // Check if we have an order_id to generate document from
    if (!invoiceData.order_id) {
      throw new Error(`Cannot generate PDF: Invoice ${input.invoice_id} is not linked to an order`)
    }

    try {
      // Use the Medusa Documents plugin to generate the PDF
      const documentInvoice = await documentsService.generateDocumentInvoice(invoiceData.order_id)
      
      // Update invoice with the generated document reference
      await invoicingService.updateInvoices({
        id: input.invoice_id,
        pdf_file_id: documentInvoice.id,
      })
      
      return new StepResponse({ 
        file: { 
          id: documentInvoice.id,
          url: `/admin/orders/${invoiceData.order_id}/invoice/pdf`,
          filename: `factuur-${invoiceData.invoice_number}.pdf`
        }, 
        invoice: invoiceData 
      }, documentInvoice.id)
      
    } catch (error) {
      console.error("Failed to generate PDF with Medusa Documents plugin:", error)
      throw new Error(`Failed to generate PDF for invoice ${input.invoice_id}: ${error.message}`)
    }
  },
  async (documentId: string, { container }) => {
    // Compensation: delete the created document if workflow fails
    if (!documentId) return
    
    let file: any
    let updatedInvoice: any
    
    try {
      const documentsService = container.resolve("documentsModuleService")
      await documentsService.deleteDocumentInvoice(documentId)
    } catch (error) {
      console.warn("Failed to delete document during compensation:", error.message)
    }
  }
)

 