import { MedusaService } from "@medusajs/framework/utils"
import Supplier from "../models/supplier.model"
import SupplierProduct from "../models/supplier-product.model"
import { PurchaseOrder, PurchaseOrderItem } from "../models/purchase-order.model"

class PurchasingService extends MedusaService({
  Supplier,
  SupplierProduct,
  PurchaseOrder,
  PurchaseOrderItem,
}) {}

export default PurchasingService 