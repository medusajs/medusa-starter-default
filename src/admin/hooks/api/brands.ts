import { QueryKey, useQuery, UseQueryOptions } from "@tanstack/react-query"

type Brand = {
  id: string
  name: string
  code: string
  is_active?: boolean
  is_oem?: boolean
  authorized_dealer?: boolean
}

type BrandsListResponse = {
  brands: Brand[]
  count: number
  offset: number
  limit: number
}

type BrandsListParams = {
  q?: string
  search?: string
  limit?: number
  offset?: number
  is_active?: boolean
  is_oem?: boolean
  authorized_dealer?: boolean
  order?: string
}

const BRANDS_QUERY_KEY = "brands" as const

export const useBrands = (
  query?: BrandsListParams,
  options?: Omit<
    UseQueryOptions<BrandsListResponse, Error, BrandsListResponse, QueryKey>,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (query?.q) searchParams.append("q", query.q)
      if (query?.search) searchParams.append("search", query.search)
      if (query?.limit) searchParams.append("limit", String(query.limit))
      if (query?.offset) searchParams.append("offset", String(query.offset))
      if (typeof query?.is_active === "boolean") searchParams.append("is_active", String(query.is_active))
      if (typeof query?.is_oem === "boolean") searchParams.append("is_oem", String(query.is_oem))
      if (typeof query?.authorized_dealer === "boolean") searchParams.append("authorized_dealer", String(query.authorized_dealer))
      if (query?.order) searchParams.append("order", query.order)

      const res = await fetch(`/admin/brands?${searchParams.toString()}`)
      if (!res.ok) {
        throw new Error(`Failed to fetch brands: ${res.statusText}`)
      }
      return res.json()
    },
    queryKey: [BRANDS_QUERY_KEY, query],
    ...options,
  })

  return {
    brands: data?.brands ?? [],
    count: data?.count ?? 0,
    isLoading: rest.isLoading,
    isError: rest.isError,
    error: rest.error,
    ...rest,
  }
}


