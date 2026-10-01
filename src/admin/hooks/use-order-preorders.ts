import { useQuery } from "@tanstack/react-query"
import { sdk } from "../lib/sdk"
import type { AdminOrderPreordersResponse } from "../lib/types"
import { preorderQueryKeys } from "./query-keys"

export const useOrderPreorders = (orderId: string) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: preorderQueryKeys.order(orderId),
    queryFn: () =>
      sdk.client.fetch<AdminOrderPreordersResponse>(
        `/admin/orders/${orderId}/preorders`,
      ),
    retry: 2,
    refetchOnWindowFocus: false,
  })

  return {
    preorders: data?.preorders ?? [],
    isLoading,
    isError,
  }
}
