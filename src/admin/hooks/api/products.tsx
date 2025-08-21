import { HttpTypes } from "@medusajs/types"
import {
  QueryKey,
  useMutation,
  UseMutationOptions,
  useQuery,
  UseQueryOptions,
} from "@tanstack/react-query"

const PRODUCTS_QUERY_KEY = "products" as const

interface AdminProductListParams {
  q?: string
  limit?: number
  offset?: number
  fields?: string
  expand?: string
  id?: string[]
}

interface AdminProductListResponse {
  products: any[]
  count: number
  offset: number
  limit: number
}

export const useProducts = (
  query?: AdminProductListParams,
  options?: Omit<
    UseQueryOptions<
      AdminProductListResponse,
      Error,
      AdminProductListResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      
      if (query?.q) searchParams.append('q', query.q)
      if (query?.limit) searchParams.append('limit', query.limit.toString())
      if (query?.offset) searchParams.append('offset', query.offset.toString())
      if (query?.fields) searchParams.append('fields', query.fields)
      if (query?.expand) searchParams.append('expand', query.expand)
      if (query?.id) {
        query.id.forEach(id => searchParams.append('id', id))
      }
      
      const response = await fetch(`/admin/products?${searchParams.toString()}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`)
      }
      return response.json()
    },
    queryKey: [PRODUCTS_QUERY_KEY, query],
    ...options,
  })

  return { 
    products: data?.products || [], 
    count: data?.count || 0,
    isLoading: rest.isLoading,
    isError: rest.isError,
    error: rest.error,
    ...rest 
  }
}