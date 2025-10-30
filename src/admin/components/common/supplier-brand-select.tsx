import { useEffect, useMemo, useState } from "react"
import { Select, Label } from "@medusajs/ui"

type SupplierBrand = { id: string; name: string; code: string }

type SupplierBrandSelectProps = {
  supplierId: string
  value?: string | null
  onChange?: (brandId: string | null) => void
  includeNoneOption?: boolean
  label?: string
  disabled?: boolean
}

export const SupplierBrandSelect = ({
  supplierId,
  value,
  onChange,
  includeNoneOption = true,
  label = "Brand",
  disabled,
}: SupplierBrandSelectProps) => {
  const [brands, setBrands] = useState<SupplierBrand[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/admin/suppliers/${supplierId}/brands`)
        if (!res.ok) throw new Error("Failed to load supplier brands")
        const data = await res.json()
        if (active) setBrands(data.brands || [])
      } finally {
        if (active) setLoading(false)
      }
    }
    if (supplierId) load()
    return () => {
      active = false
    }
  }, [supplierId])

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
        disabled={disabled || loading}
      >
        <Select.Trigger>
          <Select.Value placeholder={`Select ${(label || 'brand').toLowerCase()}`} />
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

export default SupplierBrandSelect


