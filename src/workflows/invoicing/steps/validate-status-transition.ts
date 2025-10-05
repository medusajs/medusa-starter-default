import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { INVOICING_MODULE } from "../../../modules/invoicing"

interface ValidateStatusTransitionInput {
  invoice_id: string
  new_status: string
}

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["sent", "cancelled"],
  sent: ["paid", "cancelled"],
  paid: [], // Cannot transition from paid
  cancelled: [], // Cannot transition from cancelled
}

export const validateStatusTransitionStep = createStep(
  "validate-status-transition",
  async (input: ValidateStatusTransitionInput, { container }) => {
    const invoicingService = container.resolve(INVOICING_MODULE)
    const invoice = await invoicingService.retrieveInvoice(input.invoice_id)

    if (!invoice) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Invoice with id ${input.invoice_id} not found`
      )
    }

    const currentStatus = invoice.status
    const newStatus = input.new_status

    // Check if transition is valid
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || []
    if (!allowedTransitions.includes(newStatus)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot change invoice status from "${currentStatus}" to "${newStatus}". Allowed transitions: ${allowedTransitions.length > 0 ? allowedTransitions.join(", ") : "none"}`
      )
    }

    return new StepResponse({ invoice, currentStatus })
  }
)
