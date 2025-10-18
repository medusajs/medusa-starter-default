import { 
  createWorkflow, 
  WorkflowResponse 
} from "@medusajs/framework/workflows-sdk"
import { generateInvoicePdfStep } from "./steps/generate-invoice-pdf"

export interface GenerateInvoicePdfInput {
  invoice_id: string
}

export const generateInvoicePdfWorkflow = createWorkflow(
  "generate-invoice-pdf",
  (input: GenerateInvoicePdfInput) => {
    // Generate PDF for the invoice
    const result = generateInvoicePdfStep({
      invoice_id: input.invoice_id
    })
    
    return new WorkflowResponse({
      pdf_buffer: result.pdf_buffer,
      invoice: result.invoice
    })
  }
)