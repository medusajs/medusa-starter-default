import { defineLink } from "@medusajs/framework/utils"
import { SERVICE_ORDERS_MODULE } from "../modules/service-orders"
import { TECHNICIANS_MODULE } from "../modules/technicians"

export default defineLink(
  {
    linkable: { serviceName: SERVICE_ORDERS_MODULE, alias: "service_order" },
    field: "technician_id",
  },
  {
    linkable: { serviceName: TECHNICIANS_MODULE, alias: "technician" },
  },
  {
    readOnly: true,
  }
) 