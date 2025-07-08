import { defineLink } from "@medusajs/framework/utils"
import MachineModule from "../modules/machines"
import ServiceOrderModule from "../modules/service-orders"

export default defineLink(
  {
    linkable: MachineModule.linkable.machine,
    isList: true, // A machine can have multiple service orders
  },
  {
    linkable: ServiceOrderModule.linkable.serviceOrder,
    filterable: ["id", "service_order_number", "status", "service_type", "priority"],
  }
) 