import { useState, useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { 
  Button, 
  Text,
  toast,
  Input,
  Textarea,
  Label,
  Hint,
  ProgressTabs,
  ProgressStatus,
} from "@medusajs/ui"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import * as zod from "zod"
import { useTranslation } from "react-i18next"
import { MagnifyingGlass, InformationCircleSolid } from "@medusajs/icons"
import { Tooltip } from "@medusajs/ui"
import { RouteFocusModal, useRouteModal } from "../../../../../../components/modals"
import { KeyboundForm } from "../../../../../../components/utilities/keybound-form"
import { ProductSearchModal } from "../../../../../../components/modals/product-search-modal"

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

interface SupplierPriceListAddFormData {
  variant_id: string
  supplier_sku?: string
  gross_price?: number
  discount_percentage?: number
  net_price: number
  quantity: number
  lead_time_days?: number
  notes?: string
}

const addItemSchema = zod.object({
  variant_id: zod.string().min(1, "Please select a product variant"),
  supplier_sku: zod.string().optional(),
  gross_price: zod.number().min(0, "Gross price must be 0 or greater").optional(),
  discount_percentage: zod.number().min(0, "Discount percentage must be 0 or greater").max(100, "Discount percentage cannot exceed 100").optional(),
  net_price: zod.number().min(0, "Net price must be 0 or greater").refine(val => val > 0, "Net price is required"),
  quantity: zod.number().min(1, "Quantity must be at least 1").default(1),
  lead_time_days: zod.number().min(0, "Lead time must be 0 or greater").optional(),
  notes: zod.string().optional()
}).refine((data) => {
  // If both gross and discount are provided, ensure net price makes sense
  if (data.gross_price && data.discount_percentage !== undefined && data.gross_price > 0) {
    const expectedNet = data.gross_price * (1 - data.discount_percentage / 100)
    const tolerance = 0.02 // 2 cent tolerance
    return Math.abs(data.net_price - expectedNet) <= tolerance
  }
  return true
}, {
  message: "Net price doesn't match calculated value from gross price and discount",
  path: ["net_price"]
}).refine((data) => {
  // Ensure net price is not greater than gross price when both are provided
  if (data.gross_price && data.gross_price > 0 && data.net_price > data.gross_price) {
    return false
  }
  return true
}, {
  message: "Net price cannot be greater than gross price",
  path: ["net_price"]
})

type AddItemFormData = zod.infer<typeof addItemSchema>

enum Tab {
  PRODUCT = "product",
  DETAILS = "details",
}

const tabOrder = [Tab.PRODUCT, Tab.DETAILS] as const

type TabState = Record<Tab, ProgressStatus>

const initialTabState: TabState = {
  [Tab.PRODUCT]: "in-progress",
  [Tab.DETAILS]: "not-started",
}

interface SupplierPriceListAddFormProps {
  supplierId: string
}

export const SupplierPriceListAddForm = ({ supplierId }: SupplierPriceListAddFormProps) => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()
  const queryClient = useQueryClient()
  
  // Fetch supplier's price list
  const { data: priceListData, isLoading: isPriceListLoading } = useQuery({
    queryKey: ["supplier-price-list", supplierId],
    queryFn: async () => {
      const response = await fetch(`/admin/suppliers/${supplierId}/price-lists?include_items=true`)
      if (!response.ok) {
        throw new Error(`Failed to fetch price list: ${response.statusText}`)
      }
      return response.json()
    },
    enabled: !!supplierId,
  })
  
  const [tab, setTab] = useState<Tab>(Tab.PRODUCT)
  const [tabState, setTabState] = useState<TabState>(initialTabState)
  const [selectedVariant, setSelectedVariant] = useState<SelectedVariantForPricing | null>(null)
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false)
  const [productSearchOpen, setProductSearchOpen] = useState(false)

  const form = useForm<AddItemFormData>({
    resolver: zodResolver(addItemSchema),
    defaultValues: {
      variant_id: "",
      supplier_sku: "",
      gross_price: undefined,
      discount_percentage: undefined,
      net_price: 0,
      quantity: 1,
      lead_time_days: 0,
      notes: ""
    }
  })

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: AddItemFormData) => {
      if (!selectedVariant) {
        throw new Error("Please select a product variant")
      }
      
      const priceList = priceListData?.price_list
      if (!priceList) {
        throw new Error("No active price list found")
      }
      
      const response = await fetch(`/admin/suppliers/${supplierId}/price-lists/${priceList.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_variant_id: data.variant_id,
          product_id: selectedVariant.product_id,
          supplier_sku: data.supplier_sku,
          // gross_price not persisted in current schema; keep client-side only
          net_price: data.net_price && !isNaN(data.net_price) ? Math.round(data.net_price * 100) : 0,
          quantity: data.quantity || 1,
          lead_time_days: data.lead_time_days,
          notes: data.notes
        }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Request failed: ${response.statusText}`)
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-price-list", supplierId] })
      toast.success("Price list item added successfully")
      handleSuccess()
    },
    onError: (error) => {
      toast.error(`Failed to add item: ${error.message}`)
    }
  })

  const handleProductSelect = (variant: SelectedVariantForPricing) => {
    setSelectedVariant(variant)
    form.setValue("variant_id", variant.id)
  }


  // Bidirectional calculation logic for pricing fields
  const grossPrice = form.watch("gross_price")
  const discountPercentage = form.watch("discount_percentage")
  const netPrice = form.watch("net_price")
  
  const [lastModified, setLastModified] = useState<'gross' | 'discount' | 'net' | null>(null)
  
  // Calculate missing price field based on the other two
  useEffect(() => {
    if (isCalculatingPrice || !lastModified) return
    
    // Debounce calculations to prevent excessive triggers
    const timeoutId = setTimeout(() => {
      setIsCalculatingPrice(true)
      
      try {
        if (lastModified === 'gross' && grossPrice && discountPercentage !== undefined) {
          // Calculate net from gross and discount
          if (grossPrice > 0 && discountPercentage >= 0 && discountPercentage <= 100) {
            const calculatedNet = grossPrice * (1 - discountPercentage / 100)
            form.setValue("net_price", Math.round(calculatedNet * 100) / 100)
          }
        } else if (lastModified === 'discount' && grossPrice && discountPercentage !== undefined) {
          // Calculate net from gross and discount
          if (grossPrice > 0 && discountPercentage >= 0 && discountPercentage <= 100) {
            const calculatedNet = grossPrice * (1 - discountPercentage / 100)
            form.setValue("net_price", Math.round(calculatedNet * 100) / 100)
          }
        } else if (lastModified === 'net' && netPrice && grossPrice) {
          // Calculate discount from net and gross
          if (grossPrice > 0 && netPrice >= 0 && netPrice <= grossPrice) {
            const calculatedDiscount = ((grossPrice - netPrice) / grossPrice) * 100
            form.setValue("discount_percentage", Math.round(calculatedDiscount * 100) / 100)
          }
        }
        
        // Reset lastModified to prevent continuous calculations
        setLastModified(null)
      } finally {
        setIsCalculatingPrice(false)
      }
    }, 300) // 300ms debounce
    
    return () => clearTimeout(timeoutId)
  }, [grossPrice, discountPercentage, netPrice, lastModified, form])

  const handleChangeTab = (update: Tab) => {
    if (tab === update) return

    if (update === Tab.DETAILS) {
      if (!selectedVariant || !form.getValues("variant_id")) {
        toast.error("Please select a product variant first")
        return
      }
      setTabState(prev => ({
        ...prev,
        [Tab.PRODUCT]: "completed",
        [Tab.DETAILS]: "in-progress"
      }))
    } else if (update === Tab.PRODUCT) {
      setTabState(prev => ({
        ...prev,
        [Tab.PRODUCT]: "in-progress",
        [Tab.DETAILS]: selectedVariant ? "completed" : "not-started"
      }))
    }
    
    setTab(update)
  }

  const handleSubmit = form.handleSubmit(async (data) => {
    if (!selectedVariant) {
      toast.error("Please select a product variant")
      return
    }
    
    if (!priceListData?.price_list) {
      toast.error("No active price list found for this supplier")
      return
    }
    
    await mutateAsync(data)
  })


  // Show loading state while fetching price list
  if (isPriceListLoading) {
    return (
      <RouteFocusModal>
        <RouteFocusModal.Header>
          <RouteFocusModal.Title>Loading...</RouteFocusModal.Title>
        </RouteFocusModal.Header>
        <RouteFocusModal.Body className="flex items-center justify-center py-16">
          <Text>Loading price list...</Text>
        </RouteFocusModal.Body>
      </RouteFocusModal>
    )
  }

  // Show error if no price list found
  if (!priceListData?.price_list) {
    return (
      <RouteFocusModal>
        <RouteFocusModal.Header>
          <RouteFocusModal.Title>Error</RouteFocusModal.Title>
        </RouteFocusModal.Header>
        <RouteFocusModal.Body className="flex items-center justify-center py-16">
          <Text className="text-ui-fg-error">No active price list found for this supplier.</Text>
        </RouteFocusModal.Body>
        <RouteFocusModal.Footer>
          <RouteFocusModal.Close asChild>
            <Button variant="secondary">Close</Button>
          </RouteFocusModal.Close>
        </RouteFocusModal.Footer>
      </RouteFocusModal>
    )
  }

  return (
    <RouteFocusModal.Form form={form}>
      <ProgressTabs
        value={tab}
        onValueChange={(tab) => handleChangeTab(tab as Tab)}
        className="flex h-full flex-col overflow-hidden"
      >
        <KeyboundForm onSubmit={handleSubmit} className="flex h-full flex-col">
          <RouteFocusModal.Header>
            <div className="flex w-full items-center justify-between gap-x-4">
              <div className="-my-2 w-full max-w-[600px] border-l">
                <ProgressTabs.List className="grid w-full grid-cols-2">
                  <ProgressTabs.Trigger
                    status={tabState.product}
                    value={Tab.PRODUCT}
                  >
                    Select Product
                  </ProgressTabs.Trigger>
                  <ProgressTabs.Trigger
                    status={tabState.details}
                    value={Tab.DETAILS}
                  >
                    Pricing Details
                  </ProgressTabs.Trigger>
                </ProgressTabs.List>
              </div>
            </div>
          </RouteFocusModal.Header>
          
          <RouteFocusModal.Body className="size-full overflow-hidden">
            <ProgressTabs.Content
              className="size-full overflow-y-auto"
              value={Tab.PRODUCT}
            >
              <div className="p-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Product Search</Label>
                    <div className="relative">
                      <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-fg-muted" />
                      <Input
                        placeholder="Search for a product to add..."
                        value={selectedVariant ? `${selectedVariant.product?.title} - ${selectedVariant.title}` : ""}
                        onClick={() => setProductSearchOpen(true)}
                        readOnly
                        className="pl-9 cursor-pointer"
                      />
                    </div>
                    <Text size="small" className="text-ui-fg-subtle">
                      Click to search and select a product variant
                    </Text>
                  </div>
                  
                  {selectedVariant && (
                    <div className="p-4 bg-ui-bg-subtle rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <Text className="font-medium">{selectedVariant.product?.title}</Text>
                          <Text size="small" className="text-ui-fg-subtle">{selectedVariant.title}</Text>
                          {selectedVariant.sku && (
                            <Text size="xsmall" className="text-ui-fg-muted">SKU: {selectedVariant.sku}</Text>
                          )}
                        </div>
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => {
                            setSelectedVariant(null)
                            form.setValue("variant_id", "")
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ProgressTabs.Content>
            
            <ProgressTabs.Content
              className="size-full overflow-y-auto"
              value={Tab.DETAILS}
            >
              <div className="flex flex-1 justify-center overflow-auto px-6 py-16">
                <div className="flex w-full max-w-[720px] flex-col gap-y-8">
                  {selectedVariant && (
                    <div className="flex flex-col gap-y-1">
                      <div className="p-4 bg-ui-bg-subtle rounded-lg">
                        <Text className="font-medium">{selectedVariant.product?.title}</Text>
                        <Text size="small" className="text-ui-fg-subtle">{selectedVariant.title}</Text>
                        {selectedVariant.sku && (
                          <Text size="xsmall" className="text-ui-fg-muted">SKU: {selectedVariant.sku}</Text>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Product Information Section */}
                  <div className="space-y-4">
                    <div>
                      <Text size="large" weight="plus" className="text-ui-fg-base">
                        Product Information
                      </Text>
                      <Text size="small" className="text-ui-fg-subtle">
                        Additional product details from the supplier.
                      </Text>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex flex-col gap-y-2">
                        <div className="flex items-center gap-x-1">
                          <Label size="small" weight="plus">
                            Supplier SKU
                          </Label>
                          <Text size="small" className="text-ui-fg-muted">
                            (optional)
                          </Text>
                        </div>
                        <Controller
                          name="supplier_sku"
                          control={form.control}
                          render={({ field, fieldState }) => (
                            <div className="flex flex-col gap-y-1">
                              <Input
                                {...field}
                                placeholder="Enter supplier SKU (optional)"
                              />
                              <Hint className="text-ui-fg-subtle">
                                The supplier's SKU for this product variant
                              </Hint>
                              {fieldState.error && (
                                <Hint variant="error">
                                  {fieldState.error.message}
                                </Hint>
                              )}
                            </div>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Pricing Section */}
                  <div className="space-y-4">
                    <div>
                      <Text size="large" weight="plus" className="text-ui-fg-base">
                        Pricing Information
                      </Text>
                      <Text size="small" className="text-ui-fg-subtle">
                        Set the pricing details. Fields will auto-calculate based on your input.
                      </Text>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex flex-col gap-y-2">
                        <div className="flex items-center gap-x-1">
                          <Label size="small" weight="plus">
                            Gross Price (RRP)
                          </Label>
                          <Text size="small" className="text-ui-fg-muted">
                            (optional)
                          </Text>
                          <Tooltip content="The recommended retail price (RRP) before any discounts">
                            <InformationCircleSolid className="h-4 w-4 text-ui-fg-muted" />
                          </Tooltip>
                        </div>
                        <Controller
                          name="gross_price"
                          control={form.control}
                          render={({ field, fieldState }) => (
                            <div className="flex flex-col gap-y-1">
                              <Input
                                {...field}
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || undefined
                                  field.onChange(value)
                                  setLastModified('gross')
                                }}
                              />
                              <Hint className="text-ui-fg-subtle">
                                Used to calculate net price when discount is applied
                              </Hint>
                              {fieldState.error && (
                                <Hint variant="error">
                                  {fieldState.error.message}
                                </Hint>
                              )}
                            </div>
                          )}
                        />
                      </div>
                      
                      <div className="flex flex-col gap-y-2">
                        <div className="flex items-center gap-x-1">
                          <Label size="small" weight="plus">
                            Discount %
                          </Label>
                          <Text size="small" className="text-ui-fg-muted">
                            (optional)
                          </Text>
                          <Tooltip content="The percentage discount from gross price">
                            <InformationCircleSolid className="h-4 w-4 text-ui-fg-muted" />
                          </Tooltip>
                        </div>
                        <Controller
                          name="discount_percentage"
                          control={form.control}
                          render={({ field, fieldState }) => (
                            <div className="flex flex-col gap-y-1">
                              <Input
                                {...field}
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                placeholder="0.00"
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || undefined
                                  field.onChange(value)
                                  setLastModified('discount')
                                }}
                              />
                              <Hint className="text-ui-fg-subtle">
                                Net price will be calculated automatically
                              </Hint>
                              {fieldState.error && (
                                <Hint variant="error">
                                  {fieldState.error.message}
                                </Hint>
                              )}
                            </div>
                          )}
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-y-2">
                      <div className="flex items-center gap-x-1">
                        <Label size="small" weight="plus">
                          Net Price (What You Pay) *
                        </Label>
                        <Tooltip content="The final price you pay to the supplier">
                          <InformationCircleSolid className="h-4 w-4 text-ui-fg-muted" />
                        </Tooltip>
                      </div>
                      <Controller
                        name="net_price"
                        control={form.control}
                        render={({ field, fieldState }) => {
                          const hasCalculation = (grossPrice && discountPercentage !== undefined) || (grossPrice && netPrice)
                          return (
                            <div className="flex flex-col gap-y-1">
                              <Input
                                {...field}
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || 0
                                  field.onChange(value)
                                  setLastModified('net')
                                }}
                                className={isCalculatingPrice ? "bg-ui-bg-subtle" : ""}
                              />
                              <Hint className="text-ui-fg-subtle">
                                {hasCalculation ? "Calculated from other pricing fields" : "Enter the final price you pay to the supplier"}
                              </Hint>
                              {fieldState.error && (
                                <Hint variant="error">
                                  {fieldState.error.message}
                                </Hint>
                              )}
                            </div>
                          )
                        }}
                      />
                    </div>
                  </div>
                  
                  
                  {/* Order Information Section */}
                  <div className="space-y-4">
                    <div>
                      <Text size="large" weight="plus" className="text-ui-fg-base">
                        Order Information
                      </Text>
                      <Text size="small" className="text-ui-fg-subtle">
                        Set minimum order quantity and delivery details.
                      </Text>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex flex-col gap-y-2">
                        <div className="flex items-center gap-x-1">
                          <Label size="small" weight="plus">
                            Minimum Order Quantity
                          </Label>
                          <Tooltip content="The minimum quantity that must be ordered">
                            <InformationCircleSolid className="h-4 w-4 text-ui-fg-muted" />
                          </Tooltip>
                        </div>
                        <Controller
                          name="quantity"
                          control={form.control}
                          render={({ field, fieldState }) => (
                            <div className="flex flex-col gap-y-1">
                              <Input
                                {...field}
                                type="number"
                                min="1"
                                placeholder="1"
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              />
                              <Hint className="text-ui-fg-subtle">
                                The smallest quantity that can be ordered from this supplier
                              </Hint>
                              {fieldState.error && (
                                <Hint variant="error">
                                  {fieldState.error.message}
                                </Hint>
                              )}
                            </div>
                          )}
                        />
                      </div>
                      
                      <div className="flex flex-col gap-y-2">
                        <div className="flex items-center gap-x-1">
                          <Label size="small" weight="plus">
                            Lead Time (Days)
                          </Label>
                          <Text size="small" className="text-ui-fg-muted">
                            (optional)
                          </Text>
                          <Tooltip content="Expected delivery time in business days">
                            <InformationCircleSolid className="h-4 w-4 text-ui-fg-muted" />
                          </Tooltip>
                        </div>
                        <Controller
                          name="lead_time_days"
                          control={form.control}
                          render={({ field, fieldState }) => (
                            <div className="flex flex-col gap-y-1">
                              <Input
                                {...field}
                                type="number"
                                min="0"
                                placeholder="0"
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                              <Hint className="text-ui-fg-subtle">
                                How many days until delivery after placing order
                              </Hint>
                              {fieldState.error && (
                                <Hint variant="error">
                                  {fieldState.error.message}
                                </Hint>
                              )}
                            </div>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Additional Information Section */}
                  <div className="space-y-4">
                    <div>
                      <Text size="large" weight="plus" className="text-ui-fg-base">
                        Additional Information
                      </Text>
                      <Text size="small" className="text-ui-fg-subtle">
                        Add any additional notes or comments.
                      </Text>
                    </div>
                    
                    <div className="flex flex-col gap-y-2">
                      <div className="flex items-center gap-x-1">
                        <Label size="small" weight="plus">
                          Notes
                        </Label>
                        <Text size="small" className="text-ui-fg-muted">
                          (optional)
                        </Text>
                      </div>
                      <Controller
                        name="notes"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <div className="flex flex-col gap-y-1">
                            <Textarea
                              {...field}
                              rows={3}
                              placeholder="Additional notes about this item..."
                            />
                            <Hint className="text-ui-fg-subtle">
                              Any special instructions, terms, or notes about this item
                            </Hint>
                            {fieldState.error && (
                              <Hint variant="error">
                                {fieldState.error.message}
                              </Hint>
                            )}
                          </div>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ProgressTabs.Content>
          </RouteFocusModal.Body>
          
          <RouteFocusModal.Footer>
            <div className="flex items-center justify-end gap-x-2">
              <RouteFocusModal.Close asChild>
                <Button variant="secondary" size="small">
                  Cancel
                </Button>
              </RouteFocusModal.Close>
              <PrimaryButton
                tab={tab}
                next={() => handleChangeTab(Tab.DETAILS)}
                isLoading={isPending}
                disabled={tab === Tab.PRODUCT && !selectedVariant}
              />
            </div>
          </RouteFocusModal.Footer>
        </KeyboundForm>
      </ProgressTabs>
      
      <ProductSearchModal
        open={productSearchOpen}
        onOpenChange={setProductSearchOpen}
        onSelect={handleProductSelect}
        selectedVariant={selectedVariant}
      />
    </RouteFocusModal.Form>
  )
}

type PrimaryButtonProps = {
  tab: Tab
  next: () => void
  isLoading?: boolean
  disabled?: boolean
}

const PrimaryButton = ({ tab, next, isLoading, disabled }: PrimaryButtonProps) => {
  if (tab === Tab.DETAILS) {
    return (
      <Button
        key="submit-button"
        type="submit"
        variant="primary"
        size="small"
        isLoading={isLoading}
      >
        Add Item
      </Button>
    )
  }

  return (
    <Button
      key="next-button"
      type="button"
      variant="primary"
      size="small"
      onClick={next}
      disabled={disabled}
    >
      Continue
    </Button>
  )
}