import { defineLink } from "@medusajs/framework/utils"
import { SERVICE_ORDERS_MODULE } from "../modules/service-orders"
import ProductModule from "@medusajs/medusa/product"

export default defineLink(
  {
    linkable: { serviceName: SERVICE_ORDERS_MODULE, alias: "service_order_item" },
    field: "product_id",
  },
  ProductModule.linkable.product,
  {
    readOnly: true,
  }
) 