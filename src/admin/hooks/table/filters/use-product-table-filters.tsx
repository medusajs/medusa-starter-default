import { useMemo } from "react"
import { useBrands } from "../../api/brands"

export const useProductTableFilters = () => {
  const { brands } = useBrands({ limit: 200, order: "name" })

  const brandOptions = (brands || []).map((b) => ({ label: `${b.name} (${b.code})`, value: b.id }))

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
    {
      key: "brand_id",
      label: "Brand",
      type: "select" as const,
      options: [{ label: "All brands", value: "" }, ...brandOptions],
    },
  ], [brandOptions])
}