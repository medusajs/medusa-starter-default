import { Module } from "@medusajs/framework/utils"
import Supplier from "./models/supplier.model"
import SupplierProduct from "./models/supplier-product.model"
import SupplierPriceList from "./models/supplier-price-list.model"
import SupplierPriceListItem from "./models/supplier-price-list-item.model"
import { PurchaseOrder, PurchaseOrderItem } from "./models/purchase-order.model"
import PurchasingService from "./service"

export const PURCHASING_MODULE = "purchasing"

export default Module(PURCHASING_MODULE, {
  service: PurchasingService,
  models: [
    Supplier,
    SupplierProduct,
    SupplierPriceList,
    SupplierPriceListItem,
    PurchaseOrder,
    PurchaseOrderItem,
  ],
  linkable: {
    supplier: Supplier,
    supplier_price_list: SupplierPriceList,
  },
})

export { Supplier, SupplierProduct, SupplierPriceList, SupplierPriceListItem, PurchaseOrder, PurchaseOrderItem, PurchasingService }
export * from "./types"