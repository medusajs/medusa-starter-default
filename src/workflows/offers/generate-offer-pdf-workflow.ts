import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { generateOfferPdfStep } from "./steps/generate-offer-pdf"

export type GenerateOfferPdfInput = {
  offer_id: string
}

/**
 * Workflow to generate a PDF document for an offer
 * Retrieves offer with line items and generates formatted PDF
 * Returns PDF buffer and filename
 */
export const generateOfferPdfWorkflow = createWorkflow(
  "generate-offer-pdf",
  (input: GenerateOfferPdfInput) => {
    // Generate PDF for the offer
    const pdf = generateOfferPdfStep(input)

    return new WorkflowResponse(pdf)
  }
)
