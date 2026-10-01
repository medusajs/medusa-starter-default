import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PREORDER_MODULE } from "../../modules/preorder"

type StepInput = {
  preorder_variant_ids: string[]
  order_id: string
}

export const createPreordersStep = createStep(
  "create-preorders",
  async ({
    preorder_variant_ids,
    order_id,
  }: StepInput, { container }) => {
    const preorderModuleService = container.resolve(PREORDER_MODULE)

    const uniqueIds = [...new Set(preorder_variant_ids)]

    // Re-check right before inserting; (order_id, item_id) is unique in the DB
    const existing = uniqueIds.length
      ? await preorderModuleService.listPreorders(
        { order_id, item_id: uniqueIds },
        { select: ["id", "item_id"] }
      )
      : []
    const existingItemIds = new Set(existing.map((p) => p.item_id))
    const missingIds = uniqueIds.filter((id) => !existingItemIds.has(id))

    if (!missingIds.length) {
      return new StepResponse([], [])
    }

    const preorders = await preorderModuleService.createPreorders(
      missingIds.map((id) => ({
        item_id: id,
        order_id,
      }))
    )

    return new StepResponse(preorders, preorders.map((p) => p.id))
  },
  async (preorderIds, { container }) => {
    if (!preorderIds?.length) {
      return
    }

    const preorderModuleService = container.resolve(PREORDER_MODULE)

    await preorderModuleService.deletePreorders(preorderIds)
  }
)
