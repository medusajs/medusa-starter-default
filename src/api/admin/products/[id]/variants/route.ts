import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, remoteQueryObjectFromString } from "@medusajs/framework/utils"
import { toStringOrUndefined } from "../../../../../utils/query-params"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id: productId } = req.params
    const expand = toStringOrUndefined((req as any).query?.expand)

    if (!productId) {
      return res.status(400).json({ message: "product id is required" })
    }

    const query = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

    // First, get basic variant information
    const basicFields = [
      "id",
      "title", 
      "sku",
      "product_id",
    ]

    const queryObj = remoteQueryObjectFromString({
      entryPoint: "product_variant",
      fields: basicFields,
      variables: {
        filters: { product_id: productId },
      },
    })

    const variants = await query(queryObj)

    // If expand includes brand, try to enrich with brand data
    if (expand && expand.includes("brand") && variants && variants.length > 0) {
      try {
        const enrichedVariants = []
        
        for (const variant of variants) {
          let enrichedVariant = { ...variant }
          
          // Try to get brand information for this variant
          try {
            const variantWithBrandQuery = remoteQueryObjectFromString({
              entryPoint: "product_variant",
              fields: ["id", "brand.*"],
              variables: {
                filters: { id: variant.id },
                limit: 1,
              },
            })
            
            const [variantWithBrand] = await query(variantWithBrandQuery)
            if (variantWithBrand && variantWithBrand.brand) {
              enrichedVariant.brand = variantWithBrand.brand
            }
          } catch (brandError) {
            // Brand relationship might not exist for this variant, that's okay
            console.debug(`No brand found for variant ${variant.id}:`, brandError.message)
          }
          
          enrichedVariants.push(enrichedVariant)
        }
        
        return res.json({ variants: enrichedVariants })
      } catch (enrichError) {
        console.warn("Failed to enrich variants with brand data, returning basic data:", enrichError.message)
        return res.json({ variants })
      }
    }

    return res.json({ variants })
  } catch (error: any) {
    console.error("Failed to fetch product variants:", error)
    return res.status(500).json({ 
      message: error.message || "Failed to fetch product variants" 
    })
  }
}