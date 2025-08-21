import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, remoteQueryObjectFromString } from "@medusajs/framework/utils"

type GetSupplierVariantsParams = {
  id: string
}

type GetSupplierVariantsQuery = {
  limit?: number
  offset?: number
  brand_id?: string
  q?: string
  product_id?: string
  fields?: string
}

// GET /admin/suppliers/:id/variants - Get variants supplied by this supplier (optionally filtered by brand)
export const GET = async (
  req: MedusaRequest<GetSupplierVariantsParams, GetSupplierVariantsQuery>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  
  const { id: supplierId } = req.params
  const { limit = 50, offset = 0, brand_id, q, product_id, fields } = req.query

  try {
    // First, get the brands supplied by this supplier
    const supplierBrandsQuery = remoteQueryObjectFromString({
      entryPoint: "supplier_brand",
      fields: ["brand_id"],
      variables: {
        filters: { supplier_id: supplierId },
        limit: 1000,
      },
    })

    const supplierBrandLinks = await query(supplierBrandsQuery)
    const supplierBrandIds = supplierBrandLinks?.map((link: any) => link.brand_id) || []

    if (supplierBrandIds.length === 0) {
      return res.json({
        variants: [],
        count: 0,
        limit: Number(limit),
        offset: Number(offset),
        message: "No brands associated with this supplier"
      })
    }

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

    // Build filters for variants
    const filters: any = {
      "brand.id": brand_id || { $in: supplierBrandIds }
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
      supplier_brand_ids: supplierBrandIds,
      filtered_by_brand: !!brand_id,
    })
  } catch (error) {
    console.error('Error fetching supplier variants:', error)
    res.status(500).json({
      error: 'Failed to fetch supplier variants',
      message: error.message
    })
  }
}