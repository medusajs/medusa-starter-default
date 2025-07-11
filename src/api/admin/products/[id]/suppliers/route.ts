import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { PURCHASING_MODULE } from "../../../../../modules/purchasing"
import PurchasingService from "../../../../../modules/purchasing/services/purchasing.service"
import { ModuleRegistrationName } from "@medusajs/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { id } = req.params
    const purchasingService = req.scope.resolve(PURCHASING_MODULE) as PurchasingService
    const productModule = req.scope.resolve(ModuleRegistrationName.PRODUCT)

    // Get product variants for this product
    const variants = await productModule.listProductVariants({ product_id: id })
    const variantIds = variants.map((v) => v.id)

    if (variantIds.length === 0) {
      return res.json({ variants: [] })
    }

    // Get supplier products for these variants
    const supplierProducts = await purchasingService.listSupplierProducts({
      product_variant_id: variantIds
    })

    if (supplierProducts.length === 0) {
      return res.json({ variants: [] })
    }

    // Get unique supplier IDs
    const supplierIds = [...new Set(supplierProducts.map(sp => sp.supplier_id))]
    
    // Fetch suppliers separately
    const suppliers = await purchasingService.listSuppliers({
      id: supplierIds
    })

    // Create a map of suppliers for quick lookup
    const supplierMap = suppliers.reduce((acc, supplier) => {
      acc[supplier.id] = supplier
      return acc
    }, {} as Record<string, any>)

    // Group supplier products by variant and add supplier data
    const variantMap = variants.reduce((acc, variant) => {
      acc[variant.id] = {
        id: variant.id,
        title: variant.title,
        sku: variant.sku,
        sourcing: []
      }
      return acc
    }, {} as Record<string, any>)

    // Add supplier products to their respective variants
    supplierProducts.forEach(sp => {
      const supplier = supplierMap[sp.supplier_id]
      if (supplier && variantMap[sp.product_variant_id]) {
        variantMap[sp.product_variant_id].sourcing.push({
          id: sp.id,
          supplier: {
            id: supplier.id,
            name: supplier.name
          },
          price: sp.price,
          supplier_sku: sp.supplier_sku
        })
      }
    })

    // Convert to array and filter out variants without sourcing
    const variantsWithSourcing = Object.values(variantMap).filter(
      (variant: any) => variant.sourcing.length > 0
    )

    res.status(200).json({ variants: variantsWithSourcing })
  } catch (error) {
    console.error("Error fetching product suppliers:", error)
    res.status(500).json({ 
      error: "Failed to fetch product suppliers",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
} 