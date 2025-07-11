import { createWorkflow, WorkflowResponse } from "@medusajs/workflows-sdk"
import { createSupplierStep } from "../steps/create-supplier"

type WorkflowInput = {
  name: string
  code?: string
  email?: string
  phone?: string
  website?: string
  contact_person?: string
  address_line_1?: string
  address_line_2?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  tax_id?: string
  payment_terms?: string
  currency_code?: string
  notes?: string
  metadata?: Record<string, any>
}

export const createSupplierWorkflow = createWorkflow(
  "create-supplier-workflow",
  (input: WorkflowInput) => {
    const { supplier } = createSupplierStep(input)
    return new WorkflowResponse({ supplier })
  }
) 