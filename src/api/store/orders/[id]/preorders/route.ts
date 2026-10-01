import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// Access is checked by verifyOrderAccess in src/api/middlewares.ts.
// `item_id` is the preorder_variant id (storefront matches it against
// variant.preorder_variant.id).
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { id: orderId } = req.params

  const { data: preorders } = await query.graph({
    entity: "preorder",
    fields: [
      "id",
      "order_id",
      "item_id",
      "status",
      "created_at",
      "updated_at",
      "item.id",
      "item.variant_id",
      "item.available_date",
      "item.status",
    ],
    filters: {
      order_id: orderId,
    },
  })

  res.json({ preorders })
}
