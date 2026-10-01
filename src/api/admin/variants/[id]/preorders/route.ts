import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  upsertProductVariantPreorderWorkflow,
} from "../../../../../workflows/upsert-product-variant-preorder"
import {
  disablePreorderVariantWorkflow,
} from "../../../../../workflows/disable-preorder-variant"
import { UpsertPreorderVariantSchema } from "./validators"

// Creates or updates (and re-enables) the preorder config of a variant
export const POST = async (
  req: AuthenticatedMedusaRequest<UpsertPreorderVariantSchema>,
  res: MedusaResponse
) => {
  const variantId = req.params.id

  const { result } = await upsertProductVariantPreorderWorkflow(req.scope)
    .run({
      input: {
        variant_id: variantId,
        available_date: new Date(req.validatedBody.available_date),
      },
    })

  res.json({
    preorder_variant: result,
  })
}

// Disables the preorder config of a variant; 404 if none exists
export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const variantId = req.params.id

  const { result } = await disablePreorderVariantWorkflow(req.scope).run({
    input: {
      variant_id: variantId,
    },
  })

  res.json({
    preorder_variant: result,
  })
}
