import { 
  createWorkflow, 
  WorkflowResponse 
} from "@medusajs/framework/workflows-sdk"
import { generateInvoicePdfStep } from "./steps/generate-invoice-pdf"

export interface GenerateInvoicePdfWorkflowInput {
  invoice_id: string
}

export const generateInvoicePdfWorkflow = createWorkflow(
  "generate-invoice-pdf",
  (input: GenerateInvoicePdfWorkflowInput) => {
    const result = generateInvoicePdfStep(input)
    
    return new WorkflowResponse(result)
  }
)