import { useMemo } from "react"
import { useQueryParams } from "../../use-query-params"

interface UseProductTableQueryProps {
  pageSize: number
  prefix: string
}

export const useProductTableQuery = ({ pageSize, prefix }: UseProductTableQueryProps) => {
  const { queryParams, setQueryParam } = useQueryParams()

  const searchParams = useMemo(() => {
    const params: any = {
      limit: pageSize,
      offset: ((queryParams[`${prefix}_page`] as number) - 1 || 0) * pageSize,
    }

    if (queryParams[`${prefix}_q`]) {
      params.q = queryParams[`${prefix}_q`]
    }

    if (queryParams[`${prefix}_status`]) {
      params.status = queryParams[`${prefix}_status`]
    }

    return params
  }, [queryParams, pageSize, prefix])

  const raw = useMemo(() => ({
    q: queryParams[`${prefix}_q`] as string,
    status: queryParams[`${prefix}_status`] as string,
    page: queryParams[`${prefix}_page`] as number,
  }), [queryParams, prefix])

  return {
    searchParams,
    raw,
  }
}