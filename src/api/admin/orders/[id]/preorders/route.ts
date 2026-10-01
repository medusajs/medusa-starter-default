import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { id: orderId } = req.params

  // Fields used by the admin preorder widget (src/admin/widgets/preorder-widget.tsx)
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
      "item.created_at",
      "item.updated_at",
      "item.product_variant.id",
      "item.product_variant.title",
      "item.product_variant.product_id",
      "item.product_variant.product.id",
      "item.product_variant.product.thumbnail",
    ],
    filters: {
      order_id: orderId,
    },
  })

  res.json({ preorders })
}
