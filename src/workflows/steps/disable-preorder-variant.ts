import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { PREORDER_MODULE } from "../../modules/preorder"
import {
  PreorderVariantStatus,
} from "../../modules/preorder/models/preorder-variant"

type StepInput = {
  variant_id: string
}

export const disablePreorderVariantStep = createStep(
  "disable-preorder-variant",
  async ({ variant_id }: StepInput, { container }) => {
    const preorderModuleService = container.resolve(PREORDER_MODULE)

    const [oldData] = await preorderModuleService.listPreorderVariants(
      { variant_id },
      { take: 1 }
    )

    if (!oldData) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `No preorder configuration found for variant ${variant_id}`
      )
    }

    const preorderVariant = await preorderModuleService.updatePreorderVariants({
      id: oldData.id,
      status: PreorderVariantStatus.DISABLED,
    })

    return new StepResponse(preorderVariant, {
      id: oldData.id,
      status: oldData.status,
    })
  },
  async (oldData, { container }) => {
    if (!oldData) {
      return
    }

    const preorderModuleService = container.resolve(PREORDER_MODULE)

    await preorderModuleService.updatePreorderVariants({
      id: oldData.id,
      status: oldData.status,
    })
  }
)
