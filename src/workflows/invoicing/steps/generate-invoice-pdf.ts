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
<<<<<<< HEAD
      const page = await browser.newPage()
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' })
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          bottom: '20mm',
          left: '15mm',
          right: '15mm'
        }
      })
      
      const filename = `invoice-${invoiceData.invoice_number}.pdf`
      
      file = await fileService.createFiles({
        filename,
        mimeType: "application/pdf",
        content: Buffer.from(pdfBuffer).toString('base64'),
      })
      
      // Update invoice with PDF file ID
      updatedInvoice = await invoicingService.updateInvoices({ id: input.invoice_id }, {
        pdf_file_id: file.id,
      })
      
      await browser.close()
=======
      const documentsService = container.resolve("documentsModuleService")
      await documentsService.deleteDocumentInvoice(documentId)
>>>>>>> 22e8989 (Improve Invoicing module)
    } catch (error) {
      console.warn("Failed to delete document during compensation:", error.message)
    }
<<<<<<< HEAD
    
    return new StepResponse({ file, invoice: updatedInvoice || invoiceData }, file.id)
  },
  async (fileId: string, { container }) => {
    // Compensation: delete the created file if workflow fails
    if (!fileId) return
    
    const fileService = container.resolve(Modules.FILE)
    await fileService.deleteFiles(fileId)
=======
>>>>>>> 22e8989 (Improve Invoicing module)
  }
)

 