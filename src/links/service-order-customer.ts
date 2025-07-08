import { defineLink } from "@medusajs/framework/utils"
import ServiceOrdersModule from "../modules/service-orders"
import CustomerModule from "@medusajs/medusa/customer"

export default defineLink(
  {
    linkable: ServiceOrdersModule.linkable.serviceOrder,
    field: "customer_id",
  },
  CustomerModule.linkable.customer,
  {
    readOnly: true,
  }
) 