import { defineLink } from "@medusajs/framework/utils"
import { SERVICE_ORDERS_MODULE } from "../modules/service-orders"
import ProductModule from "@medusajs/medusa/product"

export default defineLink(
  {
    linkable: { serviceName: SERVICE_ORDERS_MODULE, alias: "service_order_item" },
    field: "variant_id",
  },
  ProductModule.linkable.product_variant,
  {
    readOnly: true,
  }
) 