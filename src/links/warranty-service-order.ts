import { defineLink } from "@medusajs/framework/utils"
import WarrantiesModule from "../modules/warranties"
import ServiceOrdersModule from "../modules/service-orders"

export default defineLink(
  WarrantiesModule.linkable.warranty,
  ServiceOrdersModule.linkable.serviceOrder
) 