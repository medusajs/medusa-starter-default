import ServiceOrdersService from "./service"
import ServiceOrder from "./models/service-order"
import ServiceOrderItem from "./models/service-order-item"
import ServiceOrderTimeEntry from "./models/service-order-time-entry"
import ServiceOrderStatusHistory from "./models/service-order-status-history"
import { Module } from "@medusajs/framework/utils"

export const SERVICE_ORDERS_MODULE = "serviceOrders"

const ServiceOrdersModule = Module(SERVICE_ORDERS_MODULE, {
  service: ServiceOrdersService,
  models: [ServiceOrder, ServiceOrderItem, ServiceOrderTimeEntry, ServiceOrderStatusHistory],
  linkable: {
    service_order: ServiceOrder,
    service_order_item: ServiceOrderItem,
    service_order_time_entry: ServiceOrderTimeEntry,
    service_order_status_history: ServiceOrderStatusHistory,
  },
})

export default ServiceOrdersModule

export { 
  ServiceOrder, 
  ServiceOrderItem, 
  ServiceOrderTimeEntry, 
  ServiceOrderStatusHistory, 
  ServiceOrdersService 
} 