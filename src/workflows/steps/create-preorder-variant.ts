import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PREORDER_MODULE } from "../../modules/preorder"

type StepInput = {
  variant_id: string
  available_date: Date
}

export const createPreorderVariantStep = createStep(
  "create-preorder-variant",
  async (input: StepInput, { container }) => {
    const preorderModuleService = container.resolve(
      PREORDER_MODULE
    )

    const preorderVariant = await preorderModuleService.createPreorderVariants(
      input
    )

    return new StepResponse(preorderVariant, preorderVariant.id)
  },
  async (preorderVariantId, { container }) => {
    if (!preorderVariantId) {
      return
    }

    const preorderModuleService = container.resolve(
      PREORDER_MODULE
    )

    await preorderModuleService.deletePreorderVariants(preorderVariantId)
  }
)
