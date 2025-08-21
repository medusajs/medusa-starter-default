import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Text,
  Badge,
  DropdownMenu,
  IconButton,
} from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { EllipsisHorizontal, PencilSquare } from "@medusajs/icons"

interface Product {
  id: string
  title: string
  variants: ProductVariant[]
}

interface ProductVariant {
  id: string
  title: string
  sku: string | null
  brand?: {
    id: string
    name: string
    code: string
  }
}

interface WidgetProps {
  data: Product
}

const VariantBrandChips = ({ data }: WidgetProps) => {
  // Query to get variants with brand information
  const { data: enrichedVariants, isLoading } = useQuery({
    queryKey: ["product-variants-brand-chips", data.id],
    queryFn: async () => {
      const response = await fetch(`/admin/products/${data.id}/variants?expand=brand`)
      if (!response.ok) {
        // Fallback to using data.variants if API fails
        return data.variants || []
      }
      const result = await response.json()
      return result.variants || []
    },
    enabled: !!data?.id,
  })

  const variants = enrichedVariants || data.variants || []

  // Group variants by brand
  const variantsByBrand = variants.reduce((acc: Record<string, ProductVariant[]>, variant) => {
    const brandKey = variant.brand ? variant.brand.id : 'no-brand'
    if (!acc[brandKey]) {
      acc[brandKey] = []
    }
    acc[brandKey].push(variant)
    return acc
  }, {})

  if (!data?.id) return null

  // Don't show if no variants or all loading
  if (isLoading || variants.length === 0) return null

  // Check if any variants have brands assigned
  const hasAnyBrands = variants.some(v => v.brand)
  if (!hasAnyBrands) return null

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h3">Variant Brands</Heading>
        <Text className="text-ui-fg-subtle">Brand assignments for product variants</Text>
      </div>
      
      <div className="px-6 py-4">
        <div className="space-y-4">
          {Object.entries(variantsByBrand).map(([brandKey, brandVariants]) => {
            const brand = brandVariants[0]?.brand
            
            if (brandKey === 'no-brand') {
              return (
                <div key={brandKey} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="grey" size="small">No Brand</Badge>
                    <Text size="small" className="text-ui-fg-muted">
                      {brandVariants.length} variant{brandVariants.length !== 1 ? 's' : ''}
                    </Text>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {brandVariants.slice(0, 3).map(variant => (
                      <Text key={variant.id} size="xsmall" className="text-ui-fg-subtle bg-ui-bg-subtle px-2 py-1 rounded">
                        {variant.title}
                      </Text>
                    ))}
                    {brandVariants.length > 3 && (
                      <Text size="xsmall" className="text-ui-fg-subtle">
                        +{brandVariants.length - 3} more
                      </Text>
                    )}
                  </div>
                </div>
              )
            }

            return (
              <div key={brandKey} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="blue" size="small">
                    {brand?.name} ({brand?.code})
                  </Badge>
                  <Text size="small" className="text-ui-fg-muted">
                    {brandVariants.length} variant{brandVariants.length !== 1 ? 's' : ''}
                  </Text>
                </div>
                <div className="flex flex-wrap gap-1 max-w-xs">
                  {brandVariants.slice(0, 3).map(variant => (
                    <Text key={variant.id} size="xsmall" className="text-ui-fg-subtle bg-ui-bg-subtle px-2 py-1 rounded">
                      {variant.title || variant.sku}
                    </Text>
                  ))}
                  {brandVariants.length > 3 && (
                    <Text size="xsmall" className="text-ui-fg-subtle">
                      +{brandVariants.length - 3} more
                    </Text>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Container>
  )
}

export default VariantBrandChips

export const config = defineWidgetConfig({
  zone: "product.details.before",
})