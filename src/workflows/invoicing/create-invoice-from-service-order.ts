import { 
  createWorkflow, 
  WorkflowResponse 
} from "@medusajs/framework/workflows-sdk"
import { convertServiceOrderToInvoiceStep } from "./steps/convert-service-order-to-invoice"

export interface CreateInvoiceFromServiceOrderInput {
  service_order_id: string
  invoice_type?: "service_work" | "mixed"
  due_date?: Date
  payment_terms?: string
  notes?: string
  created_by?: string
}

export const createInvoiceFromServiceOrderWorkflow = createWorkflow(
  "create-invoice-from-service-order",
  (input: CreateInvoiceFromServiceOrderInput) => {
    const invoice = convertServiceOrderToInvoiceStep(input)
    
    return new WorkflowResponse(invoice)
  }
) 