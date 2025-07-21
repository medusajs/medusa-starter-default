import { 
  createWorkflow, 
  WorkflowResponse 
} from "@medusajs/framework/workflows-sdk"
import { convertOrderToInvoiceStep } from "./steps/convert-order-to-invoice"
import { generateInvoicePdfStep } from "./steps/generate-invoice-pdf"

export interface CreateInvoiceWithPdfFromOrderInput {
  order_id: string
  invoice_type?: "product_sale" | "mixed"
  due_date?: Date
  payment_terms?: string
  notes?: string
  created_by?: string
}

export const createInvoiceWithPdfFromOrderWorkflow = createWorkflow(
  "create-invoice-with-pdf-from-order",
  (input: CreateInvoiceWithPdfFromOrderInput) => {
    // Step 1: Convert order to invoice
    const invoice = convertOrderToInvoiceStep(input)
    
    // Step 2: Generate PDF for the invoice
    const pdfResult = generateInvoicePdfStep({
      invoice_id: invoice.id
    })
    
    return new WorkflowResponse({
      invoice,
      pdf: pdfResult
    })
  }
)