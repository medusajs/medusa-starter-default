import { useQuery } from "@tanstack/react-query"
import {
  createVariantsByBrandQuery,
  createSupplierBrandsQuery,
  createPriceListsByBrandQuery,
  createVariantsWithBrandsQuery,
  createBrandStatsQuery,
  createProductsWithBrandQuery
} from "./remote-query-helpers"

/**
 * Hook to fetch variants by brand ID
 */
export const useVariantsByBrand = (
  brandId: string,
  options?: {
    limit?: number
    offset?: number
    fields?: string[]
  }
) => {
  return useQuery({
    queryKey: ["variants-by-brand", brandId, options],
    queryFn: async () => {
      const query = createVariantsByBrandQuery(brandId, options)
      const response = await fetch("/admin/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(query),
      })
      if (!response.ok) {
        throw new Error("Failed to fetch variants by brand")
      }
      return response.json()
    },
    enabled: !!brandId,
  })
}

/**
 * Hook to fetch supplier's linked brands
 */
export const useSupplierBrands = (
  supplierId: string,
  options?: {
    limit?: number
    fields?: string[]
  }
) => {
  return useQuery({
    queryKey: ["supplier-brands", supplierId, options],
    queryFn: async () => {
      // Use the existing API route instead of direct query
      const queryParams = new URLSearchParams()
      if (options?.limit) queryParams.set("limit", options.limit.toString())
      
      const response = await fetch(`/admin/suppliers/${supplierId}/brands?${queryParams}`)
      if (!response.ok) {
        throw new Error("Failed to fetch supplier brands")
      }
      const result = await response.json()
      return result.brands || []
    },
    enabled: !!supplierId,
  })
}

/**
 * Hook to fetch price lists by brand ID
 */
export const usePriceListsByBrand = (
  brandId: string,
  options?: {
    limit?: number
    offset?: number
    is_active?: boolean
    supplier_id?: string
    fields?: string[]
  }
) => {
  return useQuery({
    queryKey: ["price-lists-by-brand", brandId, options],
    queryFn: async () => {
      const query = createPriceListsByBrandQuery(brandId, options)
      const response = await fetch("/admin/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(query),
      })
      if (!response.ok) {
        throw new Error("Failed to fetch price lists by brand")
      }
      return response.json()
    },
    enabled: !!brandId,
  })
}

/**
 * Hook to fetch variants with brand information for a product
 */
export const useVariantsWithBrands = (
  productId: string,
  options?: {
    limit?: number
    offset?: number
    fields?: string[]
  }
) => {
  return useQuery({
    queryKey: ["variants-with-brands", productId, options],
    queryFn: async () => {
      // Use the existing API route
      const response = await fetch(`/admin/products/${productId}/variants?expand=brand`)
      if (!response.ok) {
        throw new Error("Failed to fetch variants with brands")
      }
      const result = await response.json()
      return result.variants || []
    },
    enabled: !!productId,
  })
}

/**
 * Hook to fetch brand statistics (variant count, price list count, supplier count)
 */
export const useBrandStats = (brandId: string) => {
  return useQuery({
    queryKey: ["brand-stats", brandId],
    queryFn: async () => {
      const queries = createBrandStatsQuery(brandId)
      
      // Execute all queries in parallel
      const [variantsResponse, priceListsResponse, suppliersResponse] = await Promise.all([
        fetch("/admin/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(queries.variantsQuery),
        }),
        fetch("/admin/query", {
          method: "POST", 
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(queries.priceListsQuery),
        }),
        fetch("/admin/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(queries.suppliersQuery),
        }),
      ])

      const [variants, priceLists, suppliers] = await Promise.all([
        variantsResponse.json(),
        priceListsResponse.json(),
        suppliersResponse.json(),
      ])

      return {
        variantCount: variants?.length || 0,
        priceListCount: priceLists?.length || 0,
        supplierCount: new Set(suppliers?.map((s: any) => s.supplier_id) || []).size,
      }
    },
    enabled: !!brandId,
  })
}

/**
 * Hook to fetch products filtered by brand
 */
export const useProductsByBrand = (
  filters?: {
    brand_id?: string
    status?: string
    q?: string
    limit?: number
    offset?: number
    fields?: string[]
  }
) => {
  return useQuery({
    queryKey: ["products-by-brand", filters],
    queryFn: async () => {
      const query = createProductsWithBrandQuery(filters)
      const response = await fetch("/admin/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(query),
      })
      if (!response.ok) {
        throw new Error("Failed to fetch products by brand")
      }
      return response.json()
    },
    enabled: !!filters?.brand_id,
  })
}