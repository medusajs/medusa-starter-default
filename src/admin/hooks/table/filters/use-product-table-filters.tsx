import { useMemo } from "react"

export const useProductTableFilters = () => {
  return useMemo(() => [
    {
      key: "status",
      label: "Status",
      type: "select" as const,
      options: [
        { label: "Published", value: "published" },
        { label: "Draft", value: "draft" },
      ],
    },
  ], [])
}