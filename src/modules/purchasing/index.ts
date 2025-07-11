import { Module } from "@medusajs/framework/utils"
import { PurchaseOrder, PurchaseOrderItem } from "./models/purchase-order.model"
import Supplier from "./models/supplier.model"
import SupplierProduct from "./models/supplier-product.model"
import PurchaseOrderService from "./services/purchase-order.service"
import SupplierService from "./services/supplier.service"

export const PURCHASING_MODULE = "purchasing"

export default Module(PURCHASING_MODULE, {
  service: [PurchaseOrderService, SupplierService],
})

export { 
  PurchaseOrder, 
  PurchaseOrderItem, 
  Supplier, 
  SupplierProduct,
  PurchaseOrderService,
  SupplierService
}

export * from "./types"