import { useMemo } from "react"
import { Select, Label } from "@medusajs/ui"
import { useBrands } from "../../hooks/api/brands"

type BrandSelectProps = {
  value?: string | null
  onChange?: (brandId: string | null) => void
  includeNoneOption?: boolean
  label?: string
  disabled?: boolean
}

export const BrandSelect = ({
  value,
  onChange,
  includeNoneOption = true,
  label = "Brand",
  disabled,
}: BrandSelectProps) => {
  const { brands, isLoading } = useBrands({ limit: 200, order: "name" })

  const NONE_VALUE = "__none__"
  
  const options = useMemo(() => {
    const base = brands.map((b) => ({ label: `${b.name} (${b.code})`, value: b.id }))
    return includeNoneOption ? [{ label: "— None —", value: NONE_VALUE }, ...base] : base
  }, [brands, includeNoneOption])

  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select
        value={value ?? NONE_VALUE}
        onValueChange={(val) => onChange?.(val === NONE_VALUE ? null : val)}
        disabled={disabled || isLoading}
      >
        <Select.Trigger>
          <Select.Value />
        </Select.Trigger>
        <Select.Content>
          {options.map((opt) => (
            <Select.Item key={opt.value} value={opt.value}>
              {opt.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select>
    </div>
  )
}

export default BrandSelect


