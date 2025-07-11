import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { PURCHASING_MODULE } from "../../../../../modules/purchasing"
import PurchasingService from "../../../../../modules/purchasing/services/purchasing.service"
import { ModuleRegistrationName } from "@medusajs/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const purchasingService = req.scope.resolve(PURCHASING_MODULE) as PurchasingService
  const productModule = req.scope.resolve(ModuleRegistrationName.PRODUCT)

  const variants = await productModule.listProductVariants({ product_id: id })
  const variantIds = variants.map((v) => v.id)

  if (variantIds.length === 0) {
    return res.json({ supplier_products: [] })
  }

  const supplierProducts = await purchasingService.listSupplierProducts(
    { product_variant_id: variantIds },
    { relations: ["supplier"] }
  )

  res.status(200).json({ supplier_products: supplierProducts })
} 