import { defineLink } from "@medusajs/framework/utils"
import ServiceOrdersModule from "../modules/service-orders"
import ProductModule from "@medusajs/medusa/product"

export default defineLink(
  {
    linkable: ServiceOrdersModule.linkable.serviceOrderItem,
    field: "variant_id",
  },
  ProductModule.linkable.product_variant,
  {
    readOnly: true,
  }
) 