import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createOfferStep } from "./steps/create-offer"

export type CreateOfferWorkflowInput = {
  customer_id: string
  customer_email: string
  customer_phone?: string
  offer_date?: Date
  valid_until?: Date
  currency_code?: string
  billing_address: any
  shipping_address?: any
  notes?: string
  terms_and_conditions?: string
  created_by?: string
  metadata?: Record<string, any>
}

/**
 * Workflow to create a new offer with auto-generated offer number
 * Sets default dates and initializes with DRAFT status
 */
export const createOfferWorkflow = createWorkflow(
  "create-offer",
  (input: CreateOfferWorkflowInput) => {
    // Create offer with auto-generated number
    const offer = createOfferStep(input)

    return new WorkflowResponse(offer)
  }
)
