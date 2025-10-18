import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { updateInvoiceSettingsStep } from "./steps/update-invoice-settings"

export const updateInvoiceSettingsWorkflow = createWorkflow(
  "update-invoice-settings",
  (input) => {
    const settings = updateInvoiceSettingsStep(input)
    return new WorkflowResponse(settings)
  }
)

