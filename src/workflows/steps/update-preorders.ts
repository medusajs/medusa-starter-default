import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PreorderStatus } from "../../modules/preorder/models/preorder"
import { PREORDER_MODULE } from "../../modules/preorder"

type StepInput = {
  id: string
  status?: PreorderStatus
  item_id?: string
  order_id?: string
}[]

export const updatePreordersStep = createStep(
  "update-preorders",
  async (preorders: StepInput, { container }) => {
    const preorderModuleService = container.resolve(PREORDER_MODULE)

    const oldPreorders = await preorderModuleService.listPreorders({
      id: preorders.map((preorder) => preorder.id),
    })

    const updatedPreorders = await preorderModuleService.updatePreorders(
      preorders
    )

    return new StepResponse(updatedPreorders, oldPreorders)
  },
  async (preorders, { container }) => {
    if (!preorders) {
      return
    }

    const preorderModuleService = container.resolve(PREORDER_MODULE)

    await preorderModuleService.updatePreorders(
      preorders.map((preorder) => ({
        id: preorder.id,
        status: preorder.status,
        item_id: preorder.item_id,
        order_id: preorder.order_id,
      }))
    )
  }
)
