import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, remoteQueryObjectFromString } from "@medusajs/framework/utils"

type GetBrandVariantsParams = {
  id: string
}

type GetBrandVariantsQuery = {
  limit?: number
  offset?: number
  q?: string
  product_id?: string
  fields?: string
}

// GET /admin/brands/:id/variants - Get all variants for a brand
export const GET = async (
  req: MedusaRequest<GetBrandVariantsParams, GetBrandVariantsQuery>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  
  const { id: brandId } = req.params
  const { limit = 50, offset = 0, q, product_id, fields } = req.query

  try {
    // Default fields to return
    const defaultFields = [
      "id",
      "title", 
      "sku",
      "product_id",
      "variant_rank",
      "allow_backorder",
      "manage_inventory", 
      "created_at",
      "updated_at",
      "product.id",
      "product.title",
      "product.handle",
      "product.status",
      "brand.*"
    ]

    // Build filters
    const filters: any = {
      "brand.id": brandId
    }

    // Add product filter if specified
    if (product_id) {
      filters.product_id = product_id
    }

    // Add search filter if specified
    if (q) {
      filters.$or = [
        { title: { $ilike: `%${q}%` } },
        { sku: { $ilike: `%${q}%` } },
        { "product.title": { $ilike: `%${q}%` } },
        { "product.handle": { $ilike: `%${q}%` } },
      ]
    }

    const queryObj = remoteQueryObjectFromString({
      entryPoint: "product_variant",
      fields: fields ? fields.split(",") : defaultFields,
      variables: {
        filters,
        limit: Number(limit),
        offset: Number(offset),
        order: { variant_rank: "ASC" },
      },
    })

    const variants = await query(queryObj)

    // Also get total count for pagination
    const countQueryObj = remoteQueryObjectFromString({
      entryPoint: "product_variant",
      fields: ["id"],
      variables: {
        filters,
        limit: 10000, // High limit for counting
      },
    })

    const allVariants = await query(countQueryObj)
    const total = allVariants?.length || 0

    res.json({
      variants: variants || [],
      count: total,
      limit: Number(limit),
      offset: Number(offset),
    })
  } catch (error) {
    console.error('Error fetching brand variants:', error)
    res.status(500).json({
      error: 'Failed to fetch brand variants',
      message: error.message
    })
  }
}