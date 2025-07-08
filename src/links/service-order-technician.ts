import { defineLink } from "@medusajs/framework/utils"
import ServiceOrdersModule from "../modules/service-orders"
import TechniciansModule from "../modules/technicians"

export default defineLink(
  {
    linkable: ServiceOrdersModule.linkable.serviceOrder,
    field: "technician_id",
  },
  {
    linkable: TechniciansModule.linkable.technician,
  },
  {
    readOnly: true,
  }
) 