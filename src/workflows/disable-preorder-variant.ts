import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { disablePreorderVariantStep } from "./steps/disable-preorder-variant"

type WorkflowInput = {
  variant_id: string
}

// Throws NOT_FOUND (404) when the variant has no preorder configuration
export const disablePreorderVariantWorkflow = createWorkflow(
  "disable-preorder-variant",
  function (input: WorkflowInput) {
    const preorderVariant = disablePreorderVariantStep({
      variant_id: input.variant_id,
    })

    return new WorkflowResponse(preorderVariant)
  }
)
