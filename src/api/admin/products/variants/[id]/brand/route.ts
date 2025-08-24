import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, remoteQueryObjectFromString } from "@medusajs/framework/utils"
import BrandsModule, { BRANDS_MODULE } from "../../../../../../modules/brands"
import ProductModule from "@medusajs/medusa/product"

interface SetVariantBrandRequest {
  brand_id: string | null
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id: variantId } = req.params
    const { brand_id } = req.body as SetVariantBrandRequest

    console.log(`PUT /admin/products/variants/${variantId}/brand`, { brand_id })

    if (!variantId) {
      return res.status(400).json({ message: "variant id is required" })
    }

    // Simple approach - just try the link operations with error handling
    const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
    
    console.log("Link service resolved successfully")
    
    // Use proper MedusaJS v2 linkage pattern with linkDefinition
    
    // Let's try the correct approach using the link service directly
    // Based on MedusaJS docs, we should be able to use dismiss and create methods
    
    console.log("Attempting to remove existing brand links for variant:", variantId)
    
    // Remove existing brand link for this variant (if any)
    try {
      await link.delete({
        linkDefinition: {
          left: {
            linkable: ProductModule.linkable.productVariant,
          },
          right: {
            linkable: BrandsModule.linkable.brand,
          },
        },
        data: [{ product_variant_id: variantId } as any],
      } as any)
      console.log(`Successfully removed existing brand links for variant ${variantId}`)
    } catch (deleteError) {
      console.log(`No existing brand link to remove for variant ${variantId}:`, deleteError.message)
      // This is fine - variant might not have had a brand before
    }

    // Create new brand link if brand_id is provided
    if (brand_id) {
      console.log(`Creating new brand link: variant ${variantId} -> brand ${brand_id}`)
      try {
        await link.create({
          linkDefinition: {
            left: {
              linkable: ProductModule.linkable.productVariant,
            },
            right: {
              linkable: BrandsModule.linkable.brand,
            },
          },
          data: [{ product_variant_id: variantId, brand_id } as any],
        } as any)
        console.log(`Successfully created brand link: variant ${variantId} -> brand ${brand_id}`)
      } catch (createError) {
        console.error("Failed to create brand link:", createError)
        
        // Let's try a different approach - maybe the linkable service names are different
        console.log("Trying alternative approach...")
        try {
          await link.create({
            product_variant_id: variantId,
            brand_id: brand_id
          })
          console.log(`Successfully created brand link with alternative approach: variant ${variantId} -> brand ${brand_id}`)
        } catch (alternativeError) {
          console.error("Alternative approach also failed:", alternativeError)
          return res.status(500).json({
            message: "Failed to create brand link with both approaches",
            primaryError: createError.message,
            alternativeError: alternativeError.message,
            variantId,
            brand_id
          })
        }
      }
    } else {
      console.log(`Brand removed from variant ${variantId} (brand_id was null/empty)`)
    }

    return res.status(204).send()
  } catch (error: any) {
    console.error("Variant brand update failed with error:", error)
    return res.status(500).json({ 
      message: "Failed to update variant brand",
      error: error.message,
      stack: error.stack
    })
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id: variantId } = req.params

    if (!variantId) {
      return res.status(400).json({ message: "variant id is required" })
    }

    const query = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

    const variantWithBrand = await query({
      entryPoint: "product_variant",
      fields: [
        "id",
        "title", 
        "sku",
        "brand.*",
      ],
      variables: {
        filters: { id: variantId },
        limit: 1,
      },
    })

    if (!variantWithBrand || variantWithBrand.length === 0) {
      return res.status(404).json({ message: "Variant not found" })
    }

    return res.json({ variant: variantWithBrand[0] })
  } catch (error: any) {
    return res.status(500).json({ 
      message: error.message || "Failed to fetch variant brand" 
    })
  }
}