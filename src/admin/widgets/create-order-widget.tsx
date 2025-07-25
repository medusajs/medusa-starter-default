import { useState } from "react"
import * as React from "react"
import * as zod from "zod"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { 
  Container, 
  Heading, 
  Button, 
  FocusModal,
  Input, 
  Select, 
  Label,
  toast,
  Text,
  DataTable,
  useDataTable,
  createDataTableColumnHelper
} from "@medusajs/ui"
import { Plus, X } from "@medusajs/icons"
import { defineWidgetConfig } from "@medusajs/admin-sdk"

const orderSchema = zod.object({
  customer_id: zod.string().min(1, "Customer is required"),
  currency_code: zod.string().min(1, "Currency is required"),
  region_id: zod.string().min(1, "Region is required"),
  sales_channel_id: zod.string().min(1, "Sales channel is required"),
  items: zod.array(zod.object({
    variant_id: zod.string(),
    quantity: zod.number().min(1),
    title: zod.string(),
    unit_price: zod.number().optional(),
  })).min(1, "At least one item is required"),
})

type OrderFormData = zod.infer<typeof orderSchema>

interface CreateOrderWidgetProps {
  data?: any
}

// Products DataTable component
const ProductsDataTable = ({ 
  products, 
  onAddProduct, 
  searchValue, 
  onSearchChange 
}: {
  products: any[]
  onAddProduct: (product: any, variant: any) => void
  searchValue: string
  onSearchChange: (value: string) => void
}) => {
  const columnHelper = createDataTableColumnHelper<any>()
  
  const columns = [
    columnHelper.accessor("title", {
      header: "Product",
      enableSorting: true,
      cell: ({ getValue, row }) => (
        <div className="flex flex-col gap-y-1">
          <Text weight="plus">{getValue()}</Text>
          {row.original.description && (
            <Text size="small" className="text-ui-fg-muted">
              {row.original.description}
            </Text>
          )}
        </div>
      ),
    }),
    columnHelper.accessor("variants", {
      header: "Variants",
      cell: ({ row }) => (
        <Text size="small" className="text-ui-fg-muted">
          {row.original.variants?.length || 0} variant(s)
        </Text>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          size="small"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation()
            const variants = row.original.variants || []
            if (variants.length > 0) {
              onAddProduct(row.original, variants[0])
            }
          }}
        >
          <Plus className="h-3 w-3" />
          Add
        </Button>
      ),
    }),
  ]

  const table = useDataTable({
    data: products,
    columns,
    rowCount: products.length,
    getRowId: (row) => row.id,
    search: {
      state: searchValue,
      onSearchChange: onSearchChange,
    },
    pagination: {
      state: {
        pageIndex: 0,
        pageSize: 10,
      },
      onPaginationChange: () => {},
    },
    onRowClick: (_, row) => {
      // Handle row click - if single variant, add directly; if multiple, show variant selection
      const variants = row.original.variants || []
      if (variants.length === 1) {
        onAddProduct(row.original, variants[0])
      } else if (variants.length > 1) {
        // For multiple variants, we can show a variant selection modal or just add the first one
        // For now, let's add the first variant (can be enhanced later)
        onAddProduct(row.original, variants[0])
      }
    },
  })

  return (
    <DataTable instance={table}>
      <DataTable.Toolbar>
        <div className="flex items-center justify-between w-full">
          <Heading level="h3">Products</Heading>
          <DataTable.Search placeholder="Search products..." />
        </div>
      </DataTable.Toolbar>
      <DataTable.Table />
      <DataTable.Pagination />
    </DataTable>
  )
}

const CreateOrderWidget = ({ }: CreateOrderWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false)
  const [customerSearch, setCustomerSearch] = useState("")
  const [productSearch, setProductSearch] = useState("")
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const queryClient = useQueryClient()

  // Fetch regions
  const { data: regions = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const response = await fetch('/admin/regions')
      if (!response.ok) throw new Error('Failed to fetch regions')
      const data = await response.json()
      return data.regions || []
    },
  })

  // Fetch sales channels
  const { data: salesChannels = [] } = useQuery({
    queryKey: ['salesChannels'],
    queryFn: async () => {
      const response = await fetch('/admin/sales-channels')
      if (!response.ok) throw new Error('Failed to fetch sales channels')
      const data = await response.json()
      return data.sales_channels || []
    },
  })

  // Fetch customers with search
  const { data: customers = [] } = useQuery({
    queryKey: ['create-order-widget-customers', customerSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: '20',
        ...(customerSearch && { q: customerSearch }),
      })
      const response = await fetch(`/admin/customers?${params}`)
      if (!response.ok) throw new Error('Failed to fetch customers')
      const data = await response.json()
      return data.customers || []
    },
    enabled: showCustomerDropdown,
  })

  // Fetch currencies from regions
  const availableCurrencies = regions.reduce((acc: any[], region: any) => {
    if (region.currency_code && !acc.find((c: any) => c.code === region.currency_code)) {
      acc.push({
        code: region.currency_code,
        name: region.currency_code.toUpperCase(),
      })
    }
    return acc
  }, [])

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customer_id: "",
      currency_code: "",
      region_id: "",
      sales_channel_id: "",
      items: [],
    },
  })

  // Set default values when data is loaded
  React.useEffect(() => {
    if (regions.length > 0 && !form.watch('region_id')) {
      form.setValue('region_id', regions[0].id, { shouldValidate: true })
      form.setValue('currency_code', regions[0].currency_code, { shouldValidate: true })
    }
  }, [regions, form])

  React.useEffect(() => {
    if (salesChannels.length > 0 && !form.watch('sales_channel_id')) {
      form.setValue('sales_channel_id', salesChannels[0].id, { shouldValidate: true })
    }
  }, [salesChannels, form])

  // Fetch products (loads immediately when modal opens, filters when searching)
  const { data: products = [], isLoading: isProductsLoading } = useQuery({
    queryKey: ['products', productSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: '50',
        ...(productSearch && { q: productSearch }),
      })
      const response = await fetch(`/admin/products?${params}`)
      if (!response.ok) throw new Error('Failed to fetch products')
      const data = await response.json()
      return data.products || []
    },
    enabled: isProductSearchOpen,
  })

  // Get selected customer info
  const selectedCustomer = customers.find((c: any) => c.id === form.watch('customer_id'))
  const selectedItems = form.watch('items')

  // Create order mutation using createOrderWorkflow directly
  const createOrderMutation = useMutation({
    mutationFn: async (data: OrderFormData) => {
      console.log('Creating order with data:', data)
      console.log('Selected customer:', selectedCustomer)
      console.log('Available regions:', regions)
      
      // Find the selected region to get its currency
      const selectedRegion = regions.find((r: any) => r.id === data.region_id)
      if (!selectedRegion) {
        throw new Error('Selected region not found')
      }
      
      // Prepare order data with addresses (following load-orders.ts pattern)
      const orderData = {
        customer_id: data.customer_id,
        email: selectedCustomer?.email,
        region_id: data.region_id,
        currency_code: data.currency_code,
        sales_channel_id: data.sales_channel_id,
        items: data.items.map(item => ({
          variant_id: item.variant_id,
          quantity: item.quantity,
          title: item.title,
          unit_price: item.unit_price,
        })),
        // Use customer's first address or create a default one
        shipping_address: selectedCustomer?.addresses?.[0] || {
          first_name: selectedCustomer?.first_name || "",
          last_name: selectedCustomer?.last_name || "",
          address_1: "Admin Created Order",
          city: "Brussels",
          country_code: "be",
          postal_code: "1000",
          phone: selectedCustomer?.phone || "+32 123 456 789"
        },
        billing_address: selectedCustomer?.addresses?.[0] || {
          first_name: selectedCustomer?.first_name || "",
          last_name: selectedCustomer?.last_name || "",
          address_1: "Admin Created Order",
          city: "Brussels", 
          country_code: "be",
          postal_code: "1000",
          phone: selectedCustomer?.phone || "+32 123 456 789"
        },
        metadata: {
          created_via: 'admin-widget',
          source: 'create-order-widget'
        }
      }
      
      console.log('Order payload:', orderData)
      
      // Use the new admin order creation endpoint
      const response = await fetch('/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      })
      
      if (!response.ok) {
        let errorMessage = `Failed to create order (${response.status})`
        try {
          const errorText = await response.text()
          console.error('Error response text:', errorText)
          // Try to parse as JSON if it looks like JSON
          if (errorText.startsWith('{')) {
            const errorData = JSON.parse(errorText)
            errorMessage = errorData.details || errorData.error || errorMessage
            console.error('Order creation error:', errorData)
          } else {
            console.error('HTML error response received')
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
        }
        throw new Error(errorMessage)
      }
      
      const result = await response.json()
      console.log('Created order:', result.order)
      
      return result.order
    },
    onSuccess: () => {
      toast.success("Order created successfully")
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setIsOpen(false)
      form.reset()
    },
    onError: (error: Error) => {
      console.error('Order creation error:', error)
      toast.error(error.message)
    },
  })

  const handleSubmit = (data: OrderFormData) => {
    createOrderMutation.mutate(data)
  }

  const addProduct = (product: any, variant: any) => {
    const existingItemIndex = selectedItems.findIndex(item => item.variant_id === variant.id)
    if (existingItemIndex >= 0) {
      const updatedItems = [...selectedItems]
      updatedItems[existingItemIndex].quantity += 1
      form.setValue('items', updatedItems, { shouldValidate: true })
    } else {
      const newItem = {
        variant_id: variant.id,
        quantity: 1,
        title: `${product.title}${variant.title !== 'Default' ? ` - ${variant.title}` : ''}`,
        unit_price: variant.prices?.[0]?.amount || 0,
      }
      form.setValue('items', [...selectedItems, newItem], { shouldValidate: true })
    }
    setIsProductSearchOpen(false)
    setProductSearch("")
  }

  const removeProduct = (variantId: string) => {
    const updatedItems = selectedItems.filter(item => item.variant_id !== variantId)
    form.setValue('items', updatedItems, { shouldValidate: true })
  }

  const updateQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeProduct(variantId)
      return
    }
    const updatedItems = selectedItems.map(item => 
      item.variant_id === variantId ? { ...item, quantity } : item
    )
    form.setValue('items', updatedItems, { shouldValidate: true })
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Quick Actions</Heading>
        <Button
          variant="secondary"
          size="small"
          onClick={() => setIsOpen(true)}
        >
          <Plus />
          Create Order
        </Button>
      </div>

      <FocusModal open={isOpen} onOpenChange={setIsOpen}>
        <FocusModal.Content>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <FocusModal.Header>
              <div className="flex items-center gap-x-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsOpen(false)
                    form.reset()
                  }}
                  type="button"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={createOrderMutation.isPending}
                  disabled={
                    createOrderMutation.isPending ||
                    !form.watch('customer_id') ||
                    !form.watch('region_id') ||
                    !form.watch('currency_code') ||
                    !form.watch('sales_channel_id') ||
                    form.watch('items').length === 0
                  }
                >
                  Create Order
                </Button>
              </div>
            </FocusModal.Header>
            
            <FocusModal.Body className="flex flex-col items-center py-16">
              <div className="flex w-full max-w-lg flex-col gap-y-8">
                {/* Header Section */}
                <div className="flex flex-col gap-y-1">
                  <Heading level="h1">Create New Order</Heading>
                  <Text className="text-ui-fg-subtle">
                    Create a new order by selecting a customer and adding products
                  </Text>
                </div>

                {/* Customer Selection Section */}
                <div className="flex flex-col gap-y-4">
                  <div className="flex flex-col gap-y-1">
                    <Heading level="h2">Customer</Heading>
                    <Text className="text-ui-fg-subtle">
                      Select the customer for this order
                    </Text>
                  </div>
                  
                  <div className="flex flex-col gap-y-2">
                    <Label htmlFor="customer-search">Customer *</Label>
                    <div className="relative">
                      <Input
                        id="customer-search"
                        placeholder="Search customers..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        onFocus={() => setShowCustomerDropdown(true)}
                      />
                      {showCustomerDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-ui-bg-base border border-ui-border-base rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                          {customers.map((customer: any) => (
                            <div
                              key={customer.id}
                              className="px-3 py-2 hover:bg-ui-bg-hover cursor-pointer"
                              onClick={() => {
                                form.setValue('customer_id', customer.id)
                                setShowCustomerDropdown(false)
                                setCustomerSearch("")
                              }}
                            >
                              <Text size="small" weight="plus">
                                {customer.first_name && customer.last_name 
                                  ? `${customer.first_name} ${customer.last_name}` 
                                  : customer.email}
                              </Text>
                              <Text size="small" className="text-ui-fg-muted">{customer.email}</Text>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedCustomer && (
                      <div className="mt-2 p-3 bg-ui-bg-subtle rounded-md border">
                        <Text size="small" weight="plus">Selected Customer:</Text>
                        <Text size="small">
                          {selectedCustomer.first_name && selectedCustomer.last_name 
                            ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` 
                            : selectedCustomer.email}
                        </Text>
                        <Text size="small" className="text-ui-fg-muted">{selectedCustomer.email}</Text>
                      </div>
                    )}
                    {form.formState.errors.customer_id && (
                      <Text size="small" className="text-ui-fg-error">
                        {form.formState.errors.customer_id.message}
                      </Text>
                    )}
                  </div>
                </div>

                {/* Items Section */}
                <div className="flex flex-col gap-y-4">
                  <div className="flex flex-col gap-y-1">
                    <div className="flex items-center justify-between">
                      <Heading level="h2">Items</Heading>
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => setIsProductSearchOpen(true)}
                        type="button"
                      >
                        <Plus className="h-4 w-4" />
                        Add Item
                      </Button>
                    </div>
                    <Text className="text-ui-fg-subtle">
                      Add products to this order
                    </Text>
                  </div>
                  
                  <div className="flex flex-col gap-y-2">
                    {selectedItems.length > 0 ? (
                      <div className="flex flex-col gap-y-2">
                        {selectedItems.map((item) => (
                          <div key={item.variant_id} className="flex items-center justify-between p-3 bg-ui-bg-subtle rounded border">
                            <div className="flex-1">
                              <Text size="small" weight="plus">{item.title}</Text>
                              {item.unit_price && item.unit_price > 0 && (
                                <Text size="small" className="text-ui-fg-muted">
                                  ${(item.unit_price / 100).toFixed(2)} each
                                </Text>
                              )}
                            </div>
                            <div className="flex items-center gap-x-2">
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(item.variant_id, parseInt(e.target.value) || 0)}
                                className="w-16"
                              />
                              <Button
                                variant="secondary"
                                size="small"
                                onClick={() => removeProduct(item.variant_id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 border-2 border-dashed border-ui-border-base rounded-md">
                        <Text className="text-ui-fg-muted">
                          No items added yet. Click "Add Item" to search for products.
                        </Text>
                      </div>
                    )}
                    {form.formState.errors.items && (
                      <Text size="small" className="text-ui-fg-error">
                        {form.formState.errors.items.message}
                      </Text>
                    )}
                  </div>
                </div>

                {/* Order Configuration Section */}
                <div className="flex flex-col gap-y-4">
                  <div className="flex flex-col gap-y-1">
                    <Heading level="h2">Configuration</Heading>
                    <Text className="text-ui-fg-subtle">
                      Configure order settings
                    </Text>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-y-2">
                      <Label htmlFor="region">Region *</Label>
                      <Controller
                        name="region_id"
                        control={form.control}
                        render={({ field }) => (
                          <Select 
                            value={field.value} 
                            onValueChange={(value) => {
                              field.onChange(value)
                              // Update currency when region changes
                              const selectedRegion = regions.find((r: any) => r.id === value)
                              if (selectedRegion) {
                                form.setValue('currency_code', selectedRegion.currency_code)
                              }
                            }}
                          >
                            <Select.Trigger>
                              <Select.Value placeholder="Select region" />
                            </Select.Trigger>
                            <Select.Content>
                              {regions.map((region: any) => (
                                <Select.Item key={region.id} value={region.id}>
                                  {region.name}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select>
                        )}
                      />
                      {form.formState.errors.region_id && (
                        <Text size="small" className="text-ui-fg-error">
                          {form.formState.errors.region_id.message}
                        </Text>
                      )}
                    </div>
                    <div className="flex flex-col gap-y-2">
                      <Label htmlFor="currency">Currency *</Label>
                      <Controller
                        name="currency_code"
                        control={form.control}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <Select.Trigger>
                              <Select.Value placeholder="Select currency" />
                            </Select.Trigger>
                            <Select.Content>
                              {availableCurrencies.map((currency: any) => (
                                <Select.Item key={currency.code} value={currency.code}>
                                  {currency.name}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select>
                        )}
                      />
                      {form.formState.errors.currency_code && (
                        <Text size="small" className="text-ui-fg-error">
                          {form.formState.errors.currency_code.message}
                        </Text>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-y-2">
                    <Label htmlFor="sales_channel">Sales Channel *</Label>
                    <Controller
                      name="sales_channel_id"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <Select.Trigger>
                            <Select.Value placeholder="Select sales channel" />
                          </Select.Trigger>
                          <Select.Content>
                            {salesChannels.map((channel: any) => (
                              <Select.Item key={channel.id} value={channel.id}>
                                {channel.name}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select>
                      )}
                    />
                    {form.formState.errors.sales_channel_id && (
                      <Text size="small" className="text-ui-fg-error">
                        {form.formState.errors.sales_channel_id.message}
                      </Text>
                    )}
                  </div>
                </div>
              </div>
            </FocusModal.Body>
          </form>
        </FocusModal.Content>
      </FocusModal>

      {/* Product Search Modal */}
      <FocusModal open={isProductSearchOpen} onOpenChange={setIsProductSearchOpen}>
        <FocusModal.Content>
          <FocusModal.Header>
            <Button
              variant="secondary"
              onClick={() => {
                setIsProductSearchOpen(false)
                setProductSearch("")
              }}
            >
              Close
            </Button>
          </FocusModal.Header>
          
          <FocusModal.Body className="flex flex-col h-full">
            <div className="flex flex-col gap-y-4 p-6">
              {/* Header Section */}
              <div className="flex flex-col gap-y-1">
                <Heading level="h1">Add Products</Heading>
                <Text className="text-ui-fg-subtle">
                  Select products and variants to add to your order
                </Text>
              </div>
            </div>

            {/* Products DataTable */}
            <div className="flex-1 px-6 pb-6">
              {isProductsLoading ? (
                <div className="text-center py-8">
                  <Text className="text-ui-fg-muted">Loading products...</Text>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-8">
                  <Text className="text-ui-fg-muted">
                    {productSearch ? 'No products found' : 'No products available'}
                  </Text>
                </div>
              ) : (
                <ProductsDataTable 
                  products={products} 
                  onAddProduct={addProduct}
                  searchValue={productSearch}
                  onSearchChange={setProductSearch}
                />
              )}
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.list.before",
})

export default CreateOrderWidget