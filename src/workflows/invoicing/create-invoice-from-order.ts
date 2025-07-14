import { 
  createWorkflow, 
  WorkflowResponse 
} from "@medusajs/framework/workflows-sdk"
import { convertOrderToInvoiceStep } from "./steps/convert-order-to-invoice"

export interface CreateInvoiceFromOrderInput {
  order_id: string
  invoice_type?: "product_sale" | "mixed"
  due_date?: Date
  payment_terms?: string
  notes?: string
  created_by?: string
}

export const createInvoiceFromOrderWorkflow = createWorkflow(
  "create-invoice-from-order",
  (input: CreateInvoiceFromOrderInput) => {
    const invoice = convertOrderToInvoiceStep(input)
    
    return new WorkflowResponse(invoice)
  }
) 