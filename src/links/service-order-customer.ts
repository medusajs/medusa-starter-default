import { defineLink } from "@medusajs/framework/utils"
import { SERVICE_ORDERS_MODULE } from "../modules/service-orders"
import CustomerModule from "@medusajs/medusa/customer"

export default defineLink(
  {
    linkable: { serviceName: SERVICE_ORDERS_MODULE, alias: "service_order" },
    field: "customer_id",
  },
  CustomerModule.linkable.customer,
  {
    readOnly: true,
  }
) 