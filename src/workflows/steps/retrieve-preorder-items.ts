import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PreorderVariantStatus } from "../../modules/preorder/models/preorder-variant"

type PreorderVariantInfo = {
  id: string
  status: string
  available_date: Date | string
}

export type RetrievePreorderItemIdsStepInput = {
  items: ({
    variant?: {
      preorder_variant?: PreorderVariantInfo | null
    } | null
  } | null)[]
  // Preorder variant ids that already have a preorder for this order
  existing_preorder_variant_ids?: string[]
}

// Same semantics as the storefront: a variant is a preorder only while its
// config is enabled and the available date lies in the future.
export function isActivePreorderVariant(
  preorderVariant: PreorderVariantInfo | null | undefined,
  now: Date = new Date()
): preorderVariant is PreorderVariantInfo {
  if (!preorderVariant || preorderVariant.status !== PreorderVariantStatus.ENABLED) {
    return false
  }

  const availableAt = new Date(preorderVariant.available_date).getTime()

  return !Number.isNaN(availableAt) && availableAt > now.getTime()
}

/**
 * Returns the unique ids of active preorder variants among the given items,
 * excluding the ones that already have a preorder.
 */
export const retrievePreorderItemIdsStep = createStep(
  "retrieve-preorder-item-ids",
  async function ({
    items,
    existing_preorder_variant_ids = [],
  }: RetrievePreorderItemIdsStepInput) {
    const now = new Date()
    const existing = new Set(existing_preorder_variant_ids)
    const ids = new Set<string>()

    for (const item of items) {
      const preorderVariant = item?.variant?.preorder_variant

      if (isActivePreorderVariant(preorderVariant, now) && !existing.has(preorderVariant.id)) {
        ids.add(preorderVariant.id)
      }
    }

    return new StepResponse([...ids])
  }
)
