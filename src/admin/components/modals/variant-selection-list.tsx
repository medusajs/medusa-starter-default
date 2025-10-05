import { Button, Text, Badge, Heading } from "@medusajs/ui"
import { Product, ProductVariant } from "./product-selection-table"

/**
 * Props for VariantSelectionList component
 * Used when a product has multiple variants and user needs to select a specific one
 */
interface VariantSelectionListProps {
  /**
   * The product whose variants are being displayed
   */
  product: Product
  /**
   * Callback when a variant is selected
   * Triggers move to line-item-details step
   */
  onSelectVariant: (variant: ProductVariant) => void
  /**
   * Optional callback for back navigation
   * Returns to product selection step
   */
  onBack?: () => void
}

/**
 * Component to display and select from a product's variants
 * Shows variant title, SKU, and price information
 * According to plan: "Display variants in a list format, show variant options, display variant-specific SKU and price"
 */
export const VariantSelectionList = ({
  product,
  onSelectVariant,
  onBack,
}: VariantSelectionListProps) => {
  const formatPrice = (variant: ProductVariant): string => {
    const price = variant.calculated_price?.calculated_amount
    const currencyPrice = variant.prices?.[0]

    // Prices are already in cents, format them properly
    if (price !== undefined) {
      const currencyCode = currencyPrice?.currency_code || "EUR"
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currencyCode,
      }).format(price)
    }

    if (currencyPrice) {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currencyPrice.currency_code,
      }).format(currencyPrice.amount)
    }

    return "-"
  }

  // Empty state - should not happen but handle gracefully
  if (!product.variants || product.variants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-4">
        <Text className="text-ui-fg-muted" weight="plus">
          No variants available
        </Text>
        <Text size="small" className="text-ui-fg-subtle">
          This product has no variants to select from.
        </Text>
        {onBack && (
          <Button variant="secondary" onClick={onBack}>
            Back to Products
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header with product context */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Heading level="h3">Select Variant</Heading>
          <Text size="small" className="text-ui-fg-muted mt-1">
            Choose a variant of <span className="font-medium">{product.title}</span>
          </Text>
        </div>
        {onBack && (
          <Button size="small" variant="secondary" onClick={onBack}>
            Back
          </Button>
        )}
      </div>

      {/* Variants List */}
      <div className="flex flex-col gap-2">
        {product.variants.map((variant) => (
          <div
            key={variant.id}
            className="flex items-center gap-4 p-4 border border-ui-border-base rounded-lg hover:bg-ui-bg-subtle transition-colors cursor-pointer group"
            onClick={() => onSelectVariant(variant)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onSelectVariant(variant)
              }
            }}
          >
            {/* Variant Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Text weight="plus">
                  {variant.title || "Default Variant"}
                </Text>
                {variant.title === product.title && (
                  <Badge size="2xsmall" color="grey">
                    Default
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3">
                {variant.sku && (
                  <Text size="small" className="text-ui-fg-muted">
                    SKU: {variant.sku}
                  </Text>
                )}
                <Text size="small" className="text-ui-fg-muted">
                  Price: {formatPrice(variant)}
                </Text>
              </div>
            </div>

            {/* Select Button */}
            <Button
              size="small"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation()
                onSelectVariant(variant)
              }}
              className="group-hover:bg-ui-bg-base"
            >
              Select
            </Button>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between p-3 bg-ui-bg-subtle rounded-lg">
        <Text size="small" className="text-ui-fg-muted">
          {product.variants.length} variant{product.variants.length !== 1 ? "s" : ""} available
        </Text>
      </div>
    </div>
  )
}
