import { Module } from "@medusajs/framework/utils"
import Supplier from "./models/supplier.model"
import SupplierProduct from "./models/supplier-product.model"
import { PurchaseOrder, PurchaseOrderItem } from "./models/purchase-order.model"
import PurchasingService from "./services/purchasing.service"

export const PURCHASING_MODULE = "purchasing"

export default Module(PURCHASING_MODULE, {
  service: PurchasingService,
  models: [Supplier, SupplierProduct, PurchaseOrder, PurchaseOrderItem],
})