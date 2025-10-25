import { useState, useEffect } from "react"
import {
  FocusModal,
  Button,
  Input,
  Textarea,
  Select,
  Label,
  toast,
  Text,
} from "@medusajs/ui"
import { useForm, Controller } from "react-hook-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ProductSelectionTable, Product, ProductVariant } from "./product-selection-table"
import { VariantSelectionList } from "./variant-selection-list"

/**
 * Modal step type
 * Flow: product-selection -> variant-selection (if multiple variants) -> line-item-details
 */
type ModalStep = 'product-selection' | 'variant-selection' | 'line-item-details'

interface AddOfferLineItemModalProps {
  offerId: string
  isOpen: boolean
  onClose: () => void
}

interface LineItemFormData {
  item_type: 'product' | 'custom'
  title: string
  description: string
  quantity: number
  unit_price: number
  tax_rate: number
  notes?: string
}

/**
 * Add Offer Line Item Modal
 * Allows adding product or custom line items to an offer
 * Following the pattern from AddLineItemModal (invoices)
 */
export const AddOfferLineItemModal = ({ offerId, isOpen, onClose }: AddOfferLineItemModalProps) => {
  const queryClient = useQueryClient()

  // Step management state
  const [step, setStep] = useState<ModalStep>('product-selection')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)

  // Item type selection - determines if we show product selection or manual entry
  const [itemType, setItemType] = useState<'product' | 'custom'>('product')

  const form = useForm<LineItemFormData>({
    defaultValues: {
      item_type: 'product',
      title: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 0.21,
      notes: '',
    }
  })

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('product-selection')
      setSelectedProduct(null)
      setSelectedVariant(null)
      setItemType('product')
      form.reset()
    }
  }, [isOpen, form])

  const addLineItemMutation = useMutation({
    mutationFn: async (data: LineItemFormData) => {
      // Convert tax_rate percentage to decimal before sending to API
      // unit_price is already in cents, no conversion needed
      const payload = {
        ...data,
        unit_price: Math.round(data.unit_price), // Keep in cents (ensure integer)
        tax_rate: data.tax_rate / 100, // Convert percentage to decimal (21 -> 0.21)
      }

      const response = await fetch(`/admin/offers/${offerId}/line-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || errorData.details || 'Failed to add line item')
      }
      return response.json()
    },
    onSuccess: () => {
      toast.success('Line item added')
      queryClient.invalidateQueries({ queryKey: ['offer', offerId] })
      onClose()
    },
    onError: (error: Error) => {
      toast.error(`Failed to add line item: ${error.message}`)
    }
  })

  const handleSubmit = form.handleSubmit((data) => {
    addLineItemMutation.mutate(data)
  })

  /**
   * Handle product selection
   * If single variant -> auto-select and move to line-item-details
   * If multiple variants -> move to variant-selection step
   */
  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product)

    if (product.variants.length === 1) {
      // Auto-select single variant and move to details
      const variant = product.variants[0]
      setSelectedVariant(variant)
      prefillFormWithVariant(product, variant)
      setStep('line-item-details')
    } else if (product.variants.length > 1) {
      // Multiple variants - show variant selection
      setStep('variant-selection')
    } else {
      // No variants - shouldn't happen but handle gracefully
      toast.error('Product has no variants available')
    }
  }

  /**
   * Handle variant selection from multi-variant product
   * Pre-fills form and moves to line-item-details step
   */
  const handleVariantSelect = (variant: ProductVariant) => {
    setSelectedVariant(variant)
    if (selectedProduct) {
      prefillFormWithVariant(selectedProduct, variant)
    }
    setStep('line-item-details')
  }

  /**
   * Pre-fill form with selected product/variant data
   */
  const prefillFormWithVariant = (product: Product, variant: ProductVariant) => {
    // Get price from variant (already in cents)
    const price = variant.calculated_price?.calculated_amount
      || variant.prices?.[0]?.amount
      || 0

    form.setValue('item_type', 'product')
    form.setValue('title', variant.title || product.title)
    form.setValue('description', product.description || '')
    form.setValue('unit_price', price) // Keep in cents
    form.setValue('quantity', 1)
    // Keep existing tax_rate default (percentage, will be converted on submit)
  }

  /**
   * Handle back navigation
   */
  const handleBack = () => {
    if (step === 'line-item-details') {
      // If we came from variant selection, go back there
      // Otherwise go back to product selection
      if (selectedProduct && selectedProduct.variants.length > 1) {
        setStep('variant-selection')
      } else {
        setStep('product-selection')
        setSelectedProduct(null)
        setSelectedVariant(null)
      }
    } else if (step === 'variant-selection') {
      setStep('product-selection')
      setSelectedProduct(null)
      setSelectedVariant(null)
    }
  }

  /**
   * Handle item type change (product vs custom entry)
   */
  const handleItemTypeChange = (type: 'product' | 'custom') => {
    setItemType(type)
    if (type === 'custom') {
      // Skip product selection and go straight to line-item-details
      setStep('line-item-details')
      setSelectedProduct(null)
      setSelectedVariant(null)
    } else {
      // Reset to product selection flow
      setStep('product-selection')
      form.reset()
    }
  }

  /**
   * Render modal title based on current step
   */
  const getModalTitle = () => {
    if (itemType === 'custom') {
      return 'Add Custom Line Item'
    }

    switch (step) {
      case 'product-selection':
        return 'Select Product'
      case 'variant-selection':
        return 'Select Variant'
      case 'line-item-details':
        return selectedProduct ? 'Configure Line Item' : 'Add Line Item'
      default:
        return 'Add Line Item'
    }
  }

  return (
    <FocusModal open={isOpen} onOpenChange={onClose}>
      <FocusModal.Content>
        <FocusModal.Header>
          <FocusModal.Title>{getModalTitle()}</FocusModal.Title>
          <FocusModal.Description>
            {step === 'product-selection' && itemType === 'product' &&
              'Search and select a product from your catalog'}
            {step === 'variant-selection' &&
              'Choose a specific variant of the selected product'}
            {step === 'line-item-details' &&
              'Review and adjust the line item details before adding to offer'}
          </FocusModal.Description>
        </FocusModal.Header>

        <FocusModal.Body className="flex flex-col overflow-hidden">
          {/* Item Type Selection (only show at start) */}
          {step === 'product-selection' && (
            <div className="flex gap-2 mb-4 p-4 border-b border-ui-border-base">
              <Button
                size="small"
                variant={itemType === 'product' ? 'primary' : 'secondary'}
                onClick={() => handleItemTypeChange('product')}
              >
                From Product Catalog
              </Button>
              <Button
                size="small"
                variant={itemType === 'custom' ? 'primary' : 'secondary'}
                onClick={() => handleItemTypeChange('custom')}
              >
                Custom Item
              </Button>
            </div>
          )}

          {/* Step-based content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Product Selection Step */}
            {step === 'product-selection' && itemType === 'product' && (
              <ProductSelectionTable onSelectProduct={handleProductSelect} />
            )}

            {/* Variant Selection Step */}
            {step === 'variant-selection' && selectedProduct && (
              <VariantSelectionList
                product={selectedProduct}
                onSelectVariant={handleVariantSelect}
                onBack={handleBack}
              />
            )}

            {/* Line Item Details Step */}
            {step === 'line-item-details' && (
              <div className="w-full max-w-2xl mx-auto">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Show product context if coming from product selection */}
                  {selectedProduct && selectedVariant && (
                    <div className="p-4 bg-ui-bg-subtle rounded-lg mb-4">
                      <Text size="small" className="text-ui-fg-muted mb-1">
                        Selected Product
                      </Text>
                      <Text weight="plus">
                        {selectedProduct.title}
                        {selectedVariant.title !== selectedProduct.title &&
                          ` - ${selectedVariant.title}`}
                      </Text>
                      {selectedVariant.sku && (
                        <Text size="small" className="text-ui-fg-muted">
                          SKU: {selectedVariant.sku}
                        </Text>
                      )}
                    </div>
                  )}

                  <div>
                    <Label>Title *</Label>
                    <Input {...form.register('title', { required: true })} />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea {...form.register('description')} rows={3} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        step="1"
                        {...form.register('quantity', { required: true, valueAsNumber: true })}
                      />
                    </div>

                    <div>
                      <Label>Unit Price *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        {...form.register('unit_price', { required: true, valueAsNumber: true })}
                      />
                      {selectedVariant && (
                        <Text size="xsmall" className="text-ui-fg-muted mt-1">
                          You can override the product price if needed
                        </Text>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>Tax Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register('tax_rate', { valueAsNumber: true })}
                      placeholder="21"
                    />
                  </div>

                  <div>
                    <Label>Comment (appears on offer)</Label>
                    <Textarea 
                      {...form.register('notes')} 
                      rows={2}
                      placeholder="Optional comment to display on the offer"
                    />
                  </div>

                  <div className="flex justify-between gap-2 pt-4">
                    {(selectedProduct || itemType === 'custom') && (
                      <Button
                        size="small"
                        type="button"
                        variant="secondary"
                        onClick={handleBack}
                      >
                        Back
                      </Button>
                    )}
                    <div className="flex gap-2 ml-auto">
                      <Button
                        size="small"
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="small"
                        type="submit"
                        isLoading={addLineItemMutation.isPending}
                      >
                        Add Line Item
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}

