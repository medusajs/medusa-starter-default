import { useEffect, useState } from "react"
import BrandSelect from "./brand-select"

type VariantBrandFieldProps = {
  value?: string | null
  onChange?: (brandId: string | null) => void
  disabled?: boolean
}

// Simple wrapper to use BrandSelect as a form field for variants
export const VariantBrandField = ({ value, onChange, disabled }: VariantBrandFieldProps) => {
  const [internalValue, setInternalValue] = useState<string | null>(value ?? null)

  useEffect(() => {
    setInternalValue(value ?? null)
  }, [value])

  return (
    <BrandSelect
      value={internalValue}
      onChange={(v) => {
        setInternalValue(v)
        onChange?.(v)
      }}
      includeNoneOption={true}
      label="Variant brand"
      disabled={disabled}
    />
  )
}

export default VariantBrandField


