import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Text,
  Badge,
} from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"

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

const ProductBrandOverview = ({ data }: WidgetProps) => {
  // Query to get variants with brand information
  const { data: enrichedVariants, isLoading } = useQuery({
    queryKey: ["product-brand-overview", data.id],
    queryFn: async () => {
      try {
        const response = await fetch(`/admin/products/${data.id}/variants?expand=brand`)
        if (!response.ok) {
          return data.variants || []
        }
        const result = await response.json()
        return result.variants || []
      } catch (error) {
        return data.variants || []
      }
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

  // Don't show if loading or no variants
  if (isLoading || variants.length === 0) return null

  // Only show if there are any brands assigned
  const brandKeys = Object.keys(variantsByBrand)
  const hasBrands = brandKeys.some(key => key !== 'no-brand')
  if (!hasBrands && brandKeys.length === 1 && brandKeys[0] === 'no-brand') return null

  const brandCount = brandKeys.filter(key => key !== 'no-brand').length
  const unassignedCount = variantsByBrand['no-brand']?.length || 0

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <Heading level="h3">Brand Overview</Heading>
            <Text className="text-ui-fg-subtle">
              Variant distribution across brands
            </Text>
          </div>
          <div className="flex items-center gap-2">
            {brandCount > 0 && (
              <Badge variant="blue" size="small">
                {brandCount} brand{brandCount !== 1 ? 's' : ''}
              </Badge>
            )}
            {unassignedCount > 0 && (
              <Badge variant="orange" size="small">
                {unassignedCount} unassigned
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(variantsByBrand)
            .sort(([a], [b]) => {
              // Show brands first, then no-brand
              if (a === 'no-brand') return 1
              if (b === 'no-brand') return -1
              return 0
            })
            .map(([brandKey, brandVariants]) => {
            const brand = brandVariants[0]?.brand
            const isNoBrand = brandKey === 'no-brand'

            return (
              <Container key={brandKey} className="p-4 border border-ui-border-base rounded-lg bg-ui-bg-base shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    {isNoBrand ? (
                      <Badge variant="grey">No Brand</Badge>
                    ) : (
                      <Badge variant="blue">
                        {brand?.name}
                      </Badge>
                    )}
                    {!isNoBrand && brand?.code && (
                      <Text size="small" className="text-ui-fg-muted mt-1">
                        Code: {brand.code}
                      </Text>
                    )}
                  </div>
                  <Text size="small" className="font-medium">
                    {brandVariants.length}
                  </Text>
                </div>
                
                <div className="space-y-2">
                  <Text size="small" className="text-ui-fg-muted font-medium">
                    Variants:
                  </Text>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {brandVariants.map(variant => (
                      <div key={variant.id} className="flex items-center justify-between">
                        <Text size="xsmall" className="text-ui-fg-subtle truncate">
                          {variant.title}
                        </Text>
                        {variant.sku && (
                          <Text size="xsmall" className="text-ui-fg-muted font-mono ml-2">
                            {variant.sku}
                          </Text>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </Container>
            )
          })}
        </div>
      </div>
    </Container>
  )
}

export default ProductBrandOverview

export const config = defineWidgetConfig({
  zone: "product.details.after",
})