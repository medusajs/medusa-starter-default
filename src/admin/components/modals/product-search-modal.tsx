import { useState } from "react"
import { 
  FocusModal, 
  Button, 
  Input,
  Text,
  Checkbox
} from "@medusajs/ui"
import { keepPreviousData } from "@tanstack/react-query"
import { MagnifyingGlass } from "@medusajs/icons"
import { useProducts } from "../../hooks/api/products"

interface SelectedVariantForPricing {
  id: string
  product_id: string
  title: string
  sku?: string
  product?: {
    id: string
    title: string
  }
}

interface ProductSearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (variant: SelectedVariantForPricing) => void
  selectedVariant?: SelectedVariantForPricing | null
}

export const ProductSearchModal = ({
  open,
  onOpenChange,
  onSelect,
  selectedVariant
}: ProductSearchModalProps) => {
  const [searchQuery, setSearchQuery] = useState("")
  
  const { products, isLoading, isError, error } = useProducts(
    { 
      q: searchQuery,
      fields: "id,title,status,thumbnail,*variants",
      limit: 50
    },
    {
      placeholderData: keepPreviousData,
      enabled: open, // Only fetch when modal is open
    }
  )

  const handleSelect = (product: any, variant: any) => {
    const selectedVariantData: SelectedVariantForPricing = {
      id: variant.id,
      product_id: product.id,
      title: variant.title || 'Default variant',
      sku: variant.sku || undefined,
      product: {
        id: product.id,
        title: product.title
      }
    }
    
    onSelect(selectedVariantData)
    onOpenChange(false)
  }

  const filteredProducts = products?.filter(product => 
    product.variants && product.variants.length > 0
  ) || []

  if (isError) {
    console.error("Error loading products:", error)
  }

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <FocusModal.Header>
          <FocusModal.Title>Select Product</FocusModal.Title>
          <FocusModal.Description>
            Choose a product variant to add to the price list
          </FocusModal.Description>
        </FocusModal.Header>
        
        <FocusModal.Body className="flex h-full flex-col gap-y-4">
          <div className="flex items-center gap-x-2">
            <div className="relative flex-1">
              <MagnifyingGlass className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-fg-muted" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
                autoFocus
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Text className="text-ui-fg-muted">Loading products...</Text>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Text className="text-ui-fg-muted">
                  {searchQuery ? "No products found" : "Start typing to search for products"}
                </Text>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="border border-ui-border-base rounded-lg p-3">
                    <div className="mb-2">
                      <Text className="font-medium">{product.title}</Text>
                      {product.description && (
                        <Text size="small" className="text-ui-fg-subtle">
                          {product.description.length > 100 
                            ? `${product.description.substring(0, 100)}...` 
                            : product.description}
                        </Text>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      {product.variants?.map((variant: any) => {
                        const isSelected = selectedVariant?.id === variant.id
                        
                        return (
                          <div
                            key={variant.id}
                            className="flex items-center gap-x-2 p-2 hover:bg-ui-bg-subtle rounded cursor-pointer"
                            onClick={() => handleSelect(product, variant)}
                          >
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleSelect(product, variant)}
                            />
                            <div className="flex-1">
                              <Text size="small" className="font-medium">
                                {variant.title || 'Default variant'}
                              </Text>
                              {variant.sku && (
                                <Text size="xsmall" className="text-ui-fg-muted">
                                  SKU: {variant.sku}
                                </Text>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FocusModal.Body>
        
        <FocusModal.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <Button
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            {selectedVariant && (
              <Button
                variant="primary"
                onClick={() => onOpenChange(false)}
              >
                Confirm Selection
              </Button>
            )}
          </div>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  )
}