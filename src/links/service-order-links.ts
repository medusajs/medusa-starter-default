import { defineLink } from "@medusajs/framework/utils"
import { Modules } from "@medusajs/framework/utils"
import ServiceOrdersModule from "../modules/service-orders"
import TechniciansModule from "../modules/technicians"

// Link service orders to customers
export const serviceOrderCustomerLink = defineLink(
  ServiceOrdersModule.linkable?.serviceOrder || "serviceOrder",
  Modules.CUSTOMER
)

// Link service orders to products (for parts used)
export const serviceOrderProductLink = defineLink(
  ServiceOrdersModule.linkable?.serviceOrder || "serviceOrder", 
  Modules.PRODUCT
)

// Link service orders to technicians
export const serviceOrderTechnicianLink = defineLink(
  ServiceOrdersModule.linkable?.serviceOrder || "serviceOrder",
  TechniciansModule.linkable?.technician || "technician"
)

export default [
  serviceOrderCustomerLink,
  serviceOrderProductLink, 
  serviceOrderTechnicianLink
] 