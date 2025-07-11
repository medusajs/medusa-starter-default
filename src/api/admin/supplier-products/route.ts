import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { PURCHASING_MODULE } from "../../../modules/purchasing"
import PurchasingService from "../../../modules/purchasing/services/purchasing.service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const purchasingService = req.scope.resolve(PURCHASING_MODULE) as PurchasingService

  const [supplierProducts, count] =
    await purchasingService.listAndCountSupplierProducts(
      req.filterableFields,
      req.listConfig
    )

  res.status(200).json({
    supplier_products: supplierProducts,
    count,
    offset: req.listConfig.skip,
    limit: req.listConfig.take,
  })
}

type AdminCreateSupplierProductPayload = {
  supplier_id: string
  product_variant_id: string
  supplier_sku?: string
  price: number
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const purchasingService = req.scope.resolve(PURCHASING_MODULE) as PurchasingService

  const payload = req.body as AdminCreateSupplierProductPayload

  if (!payload.supplier_id || !payload.product_variant_id || !payload.price) {
    return res.status(400).json({ message: "supplier_id, product_variant_id, and price are required" })
  }

  const [supplierProduct] = await purchasingService.createSupplierProducts([
    payload,
  ])

  res.status(201).json({ supplier_product: supplierProduct })
} 