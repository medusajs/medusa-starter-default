import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PURCHASING_MODULE } from "../../../../../modules/purchasing"
import PurchasingService from "../../../../../modules/purchasing/service"
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

    // Get both supplier products and price list items for these variants
    const [supplierProducts, priceListItems] = await Promise.all([
      purchasingService.listSupplierProducts({
        product_variant_id: variantIds
      }),
      purchasingService.listSupplierPriceListItems({
        product_variant_id: variantIds
      })
    ])

    // Get price lists for the price list items to access supplier info
    const priceListIds = [...new Set(priceListItems.map(item => item.price_list_id))]
    const priceLists = priceListIds.length > 0 
      ? await purchasingService.listSupplierPriceLists({
          id: priceListIds
        })
      : []

    // Create price list lookup map
    const priceListMap = priceLists.reduce((acc, priceList) => {
      acc[priceList.id] = priceList
      return acc
    }, {} as Record<string, any>)

    // Get all unique supplier IDs from both sources
    const supplierProductSupplierIds = supplierProducts.map(sp => sp.supplier_id)
    const priceListSupplierIds = priceListItems
      .map(item => priceListMap[item.price_list_id]?.supplier_id)
      .filter(Boolean)
    
    const allSupplierIds = [...new Set([...supplierProductSupplierIds, ...priceListSupplierIds])]
    
    // Fetch suppliers separately
    const suppliers = allSupplierIds.length > 0 
      ? await purchasingService.listSuppliers({
          id: allSupplierIds
        })
      : []

    // Create a map of suppliers for quick lookup
    const supplierMap = suppliers.reduce((acc, supplier) => {
      acc[supplier.id] = supplier
      return acc
    }, {} as Record<string, any>)

    // Initialize variant map
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
          price: sp.cost_price,
          net_price: sp.cost_price,
          supplier_sku: sp.supplier_sku,
          source_type: 'supplier_product'
        })
      }
    })

    // Add price list items to their respective variants
    priceListItems.forEach(item => {
      const priceList = priceListMap[item.price_list_id]
      const supplier = priceList ? supplierMap[priceList.supplier_id] : null
      
      if (supplier && variantMap[item.product_variant_id]) {
        // Check if we already have a sourcing option from this supplier
        const existingIndex = variantMap[item.product_variant_id].sourcing.findIndex(
          (sourcing: any) => sourcing.supplier.id === supplier.id
        )
        
        if (existingIndex >= 0) {
          // Update existing entry if price list has newer/better info
          const existing = variantMap[item.product_variant_id].sourcing[existingIndex]
          if (existing.source_type === 'supplier_product') {
            // Price list data should override supplier product data
            existing.price = item.net_price
            existing.gross_price = item.gross_price
            existing.discount_amount = item.discount_amount
            existing.discount_percentage = item.discount_percentage
            existing.net_price = item.net_price
            existing.supplier_sku = item.supplier_sku || existing.supplier_sku
            existing.price_list_name = priceList.name
            existing.source_type = 'price_list'
          }
        } else {
          // Add new sourcing option from price list
          variantMap[item.product_variant_id].sourcing.push({
            id: item.id,
            supplier: {
              id: supplier.id,
              name: supplier.name
            },
            price: item.net_price,
            gross_price: item.gross_price,
            discount_amount: item.discount_amount,
            discount_percentage: item.discount_percentage,
            net_price: item.net_price,
            supplier_sku: item.supplier_sku,
            price_list_name: priceList.name,
            source_type: 'price_list'
          })
        }
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