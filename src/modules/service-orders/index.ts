import ServiceOrdersService from "./service"
import ServiceOrder from "./models/service-order"
import ServiceOrderItem from "./models/service-order-item"
import ServiceOrderTimeEntry from "./models/service-order-time-entry"
import ServiceOrderStatusHistory from "./models/service-order-status-history"
import { Module } from "@medusajs/framework/utils"

export const SERVICE_ORDERS_MODULE = "serviceOrders"

const ServiceOrdersModule = Module(SERVICE_ORDERS_MODULE, {
  service: ServiceOrdersService,
})

export default ServiceOrdersModule

export { 
  ServiceOrder, 
  ServiceOrderItem, 
  ServiceOrderTimeEntry, 
  ServiceOrderStatusHistory, 
  ServiceOrdersService 
} 