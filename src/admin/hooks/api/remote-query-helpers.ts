import { remoteQueryObjectFromString } from "@medusajs/framework/utils"

/**
 * Remote Query helper for fetching variants by brand
 */
export const createVariantsByBrandQuery = (brandId: string, options?: {
  limit?: number
  offset?: number
  fields?: string[]
}) => {
  const defaultFields = [
    "id",
    "title", 
    "sku",
    "product_id",
    "product.title",
    "product.handle",
    "brand.*"
  ]

  return remoteQueryObjectFromString({
    entryPoint: "product_variant",
    fields: options?.fields || defaultFields,
    variables: {
      filters: { 
        "brand.id": brandId 
      },
      limit: options?.limit || 50,
      offset: options?.offset || 0,
    },
  })
}

/**
 * Remote Query helper for fetching supplier's linked brands
 */
export const createSupplierBrandsQuery = (supplierId: string, options?: {
  limit?: number
  fields?: string[]
}) => {
  const defaultFields = [
    "id",
    "name",
    "code", 
    "is_oem",
    "authorized_dealer",
    "created_at",
    "updated_at"
  ]

  return remoteQueryObjectFromString({
    entryPoint: "supplier_brand",
    fields: options?.fields || defaultFields,
    variables: {
      filters: { 
        supplier_id: supplierId 
      },
      limit: options?.limit || 100,
    },
  })
}

/**
 * Remote Query helper for fetching price lists by brand
 */
export const createPriceListsByBrandQuery = (brandId: string, options?: {
  limit?: number
  offset?: number
  is_active?: boolean
  supplier_id?: string
  fields?: string[]
}) => {
  const defaultFields = [
    "id",
    "name",
    "description",
    "brand_id",
    "supplier_id",
    "effective_date",
    "expiry_date",
    "currency_code",
    "is_active",
    "version",
    "upload_filename",
    "created_at",
    "updated_at",
    "brand.*",
    "supplier.name"
  ]

  const filters: any = { brand_id: brandId }
  
  if (options?.is_active !== undefined) {
    filters.is_active = options.is_active
  }
  
  if (options?.supplier_id) {
    filters.supplier_id = options.supplier_id
  }

  return remoteQueryObjectFromString({
    entryPoint: "supplier_price_list",
    fields: options?.fields || defaultFields,
    variables: {
      filters,
      limit: options?.limit || 50,
      offset: options?.offset || 0,
      order: { updated_at: "DESC" },
    },
  })
}

/**
 * Remote Query helper for fetching variants with their brand information
 */
export const createVariantsWithBrandsQuery = (productId: string, options?: {
  limit?: number
  offset?: number
  fields?: string[]
}) => {
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
    "brand.*"
  ]

  return remoteQueryObjectFromString({
    entryPoint: "product_variant",
    fields: options?.fields || defaultFields,
    variables: {
      filters: { 
        product_id: productId 
      },
      limit: options?.limit || 50,
      offset: options?.offset || 0,
      order: { variant_rank: "ASC" },
    },
  })
}

/**
 * Remote Query helper for fetching brand statistics
 */
export const createBrandStatsQuery = (brandId: string) => {
  return {
    // Count variants for this brand
    variantsQuery: remoteQueryObjectFromString({
      entryPoint: "product_variant",
      fields: ["id"],
      variables: {
        filters: { "brand.id": brandId },
        limit: 10000, // High limit for counting
      },
    }),
    
    // Count price lists for this brand
    priceListsQuery: remoteQueryObjectFromString({
      entryPoint: "supplier_price_list", 
      fields: ["id"],
      variables: {
        filters: { brand_id: brandId },
        limit: 10000,
      },
    }),

    // Count suppliers for this brand
    suppliersQuery: remoteQueryObjectFromString({
      entryPoint: "supplier_brand",
      fields: ["supplier_id"],
      variables: {
        filters: { brand_id: brandId },
        limit: 10000,
      },
    }),
  }
}

/**
 * Remote Query helper for fetching products with brand information
 */
export const createProductsWithBrandQuery = (filters?: {
  brand_id?: string
  status?: string
  q?: string
  limit?: number
  offset?: number
  fields?: string[]
}) => {
  const defaultFields = [
    "id",
    "title",
    "handle", 
    "description",
    "status",
    "created_at",
    "updated_at",
    "variants.id",
    "variants.title",
    "variants.sku",
    "variants.brand.*"
  ]

  const queryFilters: any = {}
  
  if (filters?.brand_id) {
    queryFilters["variants.brand.id"] = filters.brand_id
  }
  
  if (filters?.status) {
    queryFilters.status = filters.status
  }
  
  if (filters?.q) {
    queryFilters.$or = [
      { title: { $ilike: `%${filters.q}%` } },
      { handle: { $ilike: `%${filters.q}%` } },
      { "variants.sku": { $ilike: `%${filters.q}%` } },
    ]
  }

  return remoteQueryObjectFromString({
    entryPoint: "product",
    fields: filters?.fields || defaultFields,
    variables: {
      filters: queryFilters,
      limit: filters?.limit || 20,
      offset: filters?.offset || 0,
      order: { updated_at: "DESC" },
    },
  })
}