import { createWorkflow, transform, when, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createRemoteLinkStep, useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { Modules } from "@medusajs/framework/utils"
import { updatePreorderVariantStep } from "./steps/update-preorder-variant"
import { createPreorderVariantStep } from "./steps/create-preorder-variant"
import { PREORDER_MODULE } from "../modules/preorder"
import { PreorderVariantStatus } from "../modules/preorder/models/preorder-variant"

type WorkflowInput = {
  variant_id: string
  available_date: Date
}

export const upsertProductVariantPreorderWorkflow = createWorkflow(
  "upsert-product-variant-preorder",
  function (input: WorkflowInput) {
    useQueryGraphStep({
      entity: "product_variant",
      fields: ["id"],
      filters: {
        id: input.variant_id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    })

    const { data: preorderVariants } = useQueryGraphStep({
      entity: "preorder_variant",
      fields: ["id"],
      filters: {
        variant_id: input.variant_id,
      },
    }).config({ name: "retrieve-preorder-variant" })

    const existingId = transform({ preorderVariants }, function ({ preorderVariants }) {
      return preorderVariants[0]?.id ?? null
    })

    const updatedPreorderVariant = when(
      "update-existing-preorder-variant",
      { existingId },
      function ({ existingId }) {
        return !!existingId
      }
    ).then(function () {
      const updateInput = transform({ existingId, input }, function ({ existingId, input }) {
        return {
          id: existingId as string,
          variant_id: input.variant_id,
          available_date: input.available_date,
          status: PreorderVariantStatus.ENABLED,
        }
      })

      return updatePreorderVariantStep(updateInput)
    })

    const createdPreorderVariant = when(
      "create-preorder-variant",
      { existingId },
      function ({ existingId }) {
        return !existingId
      }
    ).then(function () {
      const preorderVariant = createPreorderVariantStep(input)

      createRemoteLinkStep([
        {
          [PREORDER_MODULE]: {
            preorder_variant_id: preorderVariant.id,
          },
          [Modules.PRODUCT]: {
            product_variant_id: preorderVariant.variant_id,
          },
        },
      ])

      return preorderVariant
    })

    const preorderVariant = transform({
      updatedPreorderVariant,
      createdPreorderVariant,
    }, function (data) {
      return data.createdPreorderVariant ?? data.updatedPreorderVariant
    })

    return new WorkflowResponse(preorderVariant)
  }
)
