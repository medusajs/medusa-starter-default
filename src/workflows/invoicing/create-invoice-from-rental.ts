import {
  createWorkflow,
  WorkflowResponse
} from "@medusajs/framework/workflows-sdk"
import { convertRentalToInvoiceStep } from "./steps/convert-rental-to-invoice"

/**
 * TEM-206: Create Invoice from Rental Workflow
 *
 * Generates an invoice from a completed rental order.
 * Based on the service order invoice workflow pattern.
 */

export interface CreateInvoiceFromRentalInput {
  rental_id: string
  invoice_type?: "service_work" | "mixed"
  due_date?: Date
  payment_terms?: string
  notes?: string
  created_by?: string
}

export const createInvoiceFromRentalWorkflow = createWorkflow(
  "create-invoice-from-rental",
  (input: CreateInvoiceFromRentalInput) => {
    const invoice = convertRentalToInvoiceStep(input)

    return new WorkflowResponse(invoice)
  }
)
