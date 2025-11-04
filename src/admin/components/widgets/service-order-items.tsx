import { 
  Container, 
  Heading, 
  Text, 
  Badge, 
  Button, 
  Table,
  Input,
  Textarea,
  FocusModal,
  Label,
  Select,
  toast,
  DataTable,
  useDataTable,
  createDataTableColumnHelper
} from "@medusajs/ui"
import { Tools, Plus, Trash, MagnifyingGlass } from "@medusajs/icons"
import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface ServiceOrderItem {
  id: string
  title: string
  description?: string
  sku?: string
  quantity_needed: number
  unit_price: number
  total_price: number
  status: string
  notes?: string
  product_id?: string
  variant_id?: string
}

interface ProductVariant {
  id: string
  title: string
  sku: string
  prices: Array<{
    amount: number
    currency_code: string
  }>
  product: {
    id: string
    title: string
    description?: string
  }
}

interface Product {
  id: string
  title: string
  description?: string
  variants: ProductVariant[]
}

interface ServiceOrder {
  id: string
  service_order_number: string
  customer_id?: string
}

interface ServiceOrderItemsWidgetProps {
  data: ServiceOrder
}

// Product Search DataTable Component
const ProductSearchDataTable = ({ 
  products, 
  onVariantSelect, 
  searchValue, 
  onSearchChange 
}: {
  products: Product[]
  onVariantSelect: (variant: ProductVariant) => void
  searchValue: string
  onSearchChange: (value: string) => void
}) => {
  const columnHelper = createDataTableColumnHelper<ProductVariant>()
  
  // Flatten products into variants for the datatable
  const variants = useMemo(() => {
    const allVariants: ProductVariant[] = []
    products.forEach(product => {
      product.variants?.forEach(variant => {
        allVariants.push({
          ...variant,
          product: product // Keep product info for display
        })
      })
    })
    return allVariants
  }, [products])
  
  // Filter variants based on search value
  const filteredVariants = useMemo(() => {
    if (!searchValue) return variants
    
    return variants.filter(variant => 
      variant.product.title.toLowerCase().includes(searchValue.toLowerCase()) ||
      variant.product.description?.toLowerCase().includes(searchValue.toLowerCase()) ||
      variant.title.toLowerCase().includes(searchValue.toLowerCase()) ||
      variant.sku.toLowerCase().includes(searchValue.toLowerCase())
    )
  }, [variants, searchValue])
  
  const columns = [
    columnHelper.accessor("product.title", {
      header: "Product",
      enableSorting: true,
      cell: ({ row }) => (
        <div 
          className="flex flex-col gap-y-1 cursor-pointer hover:bg-ui-bg-subtle p-2 rounded"
          onClick={() => onVariantSelect(row.original)}
        >
          <Text weight="plus">{row.original.product.title}</Text>
          {row.original.product.description && (
            <Text size="small" className="text-ui-fg-muted">
              {row.original.product.description}
            </Text>
          )}
        </div>
      ),
    }),
    columnHelper.accessor("title", {
      header: "Variant Type",
      enableSorting: true,
      cell: ({ getValue, row }) => (
        <div 
          className="cursor-pointer hover:bg-ui-bg-subtle p-2 rounded"
          onClick={() => onVariantSelect(row.original)}
        >
          <Text size="small">
            {getValue() === 'Default' ? 'Default Variant' : getValue()}
          </Text>
        </div>
      ),
    }),
    columnHelper.accessor("prices", {
      header: "Price (EUR)",
      cell: ({ row }) => {
        
        const eurPrice = row.original.prices?.find(price => price.currency_code === 'eur')
        
        return (
          <div 
            className="cursor-pointer hover:bg-ui-bg-subtle p-2 rounded"
            onClick={() => onVariantSelect(row.original)}
          >
            <Text size="small" weight="plus">
              {eurPrice ? `€${eurPrice.amount.toFixed(2)}` : 'No EUR price set'}
            </Text>
          </div>
        )
      },
    }),
  ]

  const table = useDataTable({
    columns,
    data: filteredVariants,
    getRowId: (variant) => variant.id,
    rowCount: filteredVariants.length,
    isLoading: false,
  })

  return (
    <DataTable instance={table}>
      <DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
        <Heading level="h2">Select Product Variant</Heading>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search products or variants..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-64"
          />
        </div>
      </DataTable.Toolbar>
      <DataTable.Table />
    </DataTable>
  )
}

const ServiceOrderItemsWidget = ({ data: serviceOrder }: ServiceOrderItemsWidgetProps) => {
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showProductSearch, setShowProductSearch] = useState(false)
  const [productSearch, setProductSearch] = useState("")
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)

  // Item mode: 'catalog' for product selection, 'manual' for custom entry
  const [itemMode, setItemMode] = useState<'catalog' | 'manual'>('catalog')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sku: '',
    quantity_needed: 1,
    unit_price: 0,
    notes: '',
  })

  // Fetch customer data for pricing context
  const { data: customer } = useQuery({
    queryKey: ['customer', serviceOrder?.customer_id],
    queryFn: async () => {
      if (!serviceOrder?.customer_id) return null
      const response = await fetch(`/admin/customers/${serviceOrder.customer_id}`)
      if (!response.ok) throw new Error('Failed to fetch customer')
      const data = await response.json()
      return data.customer
    },
    enabled: !!serviceOrder?.customer_id,
  })

  // Fetch service order items
  const { data: items, isLoading } = useQuery({
    queryKey: ["service-order-items", serviceOrder?.id],
    queryFn: async () => {
      const response = await fetch(`/admin/service-orders/${serviceOrder.id}/items`)
      if (!response.ok) throw new Error("Failed to fetch items")
      return response.json()
    },
    enabled: !!serviceOrder?.id,
  })

  // Fetch products for search with customer pricing context
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["products", productSearch, customer?.id],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: "50",
        fields: "id,title,description,variants.*,variants.prices.*",
        ...(productSearch && { q: productSearch })
      })
      
      const response = await fetch(`/admin/products?${params}`)
      if (!response.ok) throw new Error("Failed to fetch products")
      return response.json()
    },
    enabled: showProductSearch,
  })

  const addItemMutation = useMutation({
    mutationFn: async (itemData: any) => {
      const response = await fetch(`/admin/service-orders/${serviceOrder.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemData),
      })
      if (!response.ok) throw new Error("Failed to add item")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-order-items", serviceOrder.id] })
      queryClient.invalidateQueries({ queryKey: ["service-order", serviceOrder.id] })
      queryClient.invalidateQueries({ queryKey: ["service-order-comments", serviceOrder.id] })
      setShowAddModal(false)
      setSelectedVariant(null)
      setItemMode('catalog')
      setFormData({
        title: '',
        description: '',
        sku: '',
        quantity_needed: 1,
        unit_price: 0,
        notes: '',
      })
      toast.success("Item added successfully")
    },
    onError: (error) => {
      toast.error(`Failed to add item: ${error.message}`)
    }
  })

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`/admin/service-orders/${serviceOrder.id}/items/${itemId}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to remove item")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-order-items", serviceOrder.id] })
      queryClient.invalidateQueries({ queryKey: ["service-order", serviceOrder.id] })
      queryClient.invalidateQueries({ queryKey: ["service-order-comments", serviceOrder.id] })
      toast.success("Item removed successfully")
    },
    onError: (error) => {
      toast.error(`Failed to remove item: ${error.message}`)
    }
  })

  const handleVariantSelect = (variant: ProductVariant) => {
    setSelectedVariant(variant)
    setShowProductSearch(false)
    setProductSearch("")
  }

  const handleItemModeChange = (mode: 'catalog' | 'manual') => {
    setItemMode(mode)
    setSelectedVariant(null)
    setProductSearch("")
    // Reset form data when switching modes
    if (mode === 'manual') {
      setFormData({
        title: '',
        description: '',
        sku: '',
        quantity_needed: 1,
        unit_price: 0,
        notes: '',
      })
    } else {
      setFormData({
        title: '',
        description: '',
        sku: '',
        quantity_needed: 1,
        unit_price: 0,
        notes: '',
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (itemMode === 'catalog') {
      // Catalog mode: require selected variant
      if (!selectedVariant) {
        toast.error("Please select a product variant")
        return
      }

      // Get the EUR price from the variant's prices array
      const eurPrice = selectedVariant.prices?.find(price => price.currency_code === 'eur')
      const unitPrice = eurPrice ? eurPrice.amount : 0

      // Check if the variant has an EUR price
      if (!eurPrice || eurPrice.amount === 0) {
        toast.error("This variant doesn't have an EUR price set up. Please set an EUR price for this variant first.")
        return
      }

      const itemData = {
        title: `${selectedVariant.product.title}${selectedVariant.title !== 'Default' ? ` - ${selectedVariant.title}` : ''}`,
        description: selectedVariant.product.description || '',
        sku: selectedVariant.sku,
        quantity_needed: formData.quantity_needed,
        unit_price: unitPrice,
        notes: formData.notes,
        product_id: selectedVariant.product.id,
        variant_id: selectedVariant.id,
      }

      addItemMutation.mutate(itemData)
    } else {
      // Manual mode: validate manual fields
      if (!formData.title || formData.title.trim() === '') {
        toast.error("Title is required")
        return
      }

      if (!formData.quantity_needed || formData.quantity_needed <= 0) {
        toast.error("Quantity must be greater than 0")
        return
      }

      if (formData.unit_price === undefined || formData.unit_price === null) {
        toast.error("Unit price is required")
        return
      }

      const itemData = {
        title: formData.title,
        description: formData.description || '',
        sku: formData.sku || undefined,
        quantity_needed: formData.quantity_needed,
        unit_price: formData.unit_price,
        notes: formData.notes || undefined,
        // Omit product_id and variant_id for manual items
      }

      addItemMutation.mutate(itemData)
    }
  }

  const handleDeleteItem = (itemId: string, itemTitle: string) => {
    if (confirm(`Are you sure you want to remove "${itemTitle}" from this service order?`)) {
      deleteItemMutation.mutate(itemId)
    }
  }

  if (!serviceOrder) {
    return null
  }

  const serviceOrderItems = items?.items || []

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Parts & Items</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {serviceOrderItems.length} item{serviceOrderItems.length !== 1 ? 's' : ''} added
          </Text>
        </div>
        <Button size="small" variant="secondary" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Text>Loading items...</Text>
        </div>
      ) : serviceOrderItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <Tools className="w-12 h-12 text-ui-fg-muted mb-4" />
          <Text className="text-ui-fg-muted mb-2">No items added yet</Text>
          <Text size="small" className="text-ui-fg-subtle">
            Add parts and items needed for this service order
          </Text>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell><Label size="small" weight="plus">Item</Label></Table.HeaderCell>
              <Table.HeaderCell><Label size="small" weight="plus">SKU</Label></Table.HeaderCell>
              <Table.HeaderCell><Label size="small" weight="plus">Quantity</Label></Table.HeaderCell>
              <Table.HeaderCell><Label size="small" weight="plus">Unit Price</Label></Table.HeaderCell>
              <Table.HeaderCell><Label size="small" weight="plus">Total</Label></Table.HeaderCell>
              <Table.HeaderCell><Label size="small" weight="plus">Status</Label></Table.HeaderCell>
              <Table.HeaderCell><Label size="small" weight="plus">Actions</Label></Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {serviceOrderItems.map((item: ServiceOrderItem) => (
              <Table.Row key={item.id}>
                <Table.Cell>
                  <div>
                    <Text weight="plus" size="small">{item.title}</Text>
                    {item.description && (
                      <Text size="small" className="text-ui-fg-subtle">
                        {item.description}
                      </Text>
                    )}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">{item.sku || '-'}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">{item.quantity_needed}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">€{item.unit_price?.toFixed(2)}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">€{item.total_price?.toFixed(2)}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Badge size="2xsmall" color={
                    item.status === 'pending' ? 'orange' :
                    item.status === 'ordered' ? 'blue' :
                    item.status === 'received' ? 'green' :
                    item.status === 'used' ? 'purple' : 'grey'
                  }>
                    {item.status}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Button
                    variant="transparent"
                    size="small"
                    onClick={() => handleDeleteItem(item.id, item.title)}
                    disabled={deleteItemMutation.isPending}
                  >
                    <Trash className="w-4 h-4" />
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      {/* Add Item Modal */}
      <FocusModal open={showAddModal} onOpenChange={setShowAddModal}>
        <FocusModal.Content>
          <FocusModal.Header>
            <div className="flex items-center justify-between">
              <div>
                <Heading level="h2">
                  {itemMode === 'catalog' ? 'Add Item from Catalog' : 'Add Manual Item'}
                </Heading>
                <Text className="text-ui-fg-subtle mt-1">
                  {itemMode === 'catalog'
                    ? 'Select a product variant and specify the quantity needed'
                    : 'Enter item details manually without selecting from catalog'
                  }
                </Text>
              </div>
              <FocusModal.Close asChild>
                <Button variant="secondary">Cancel</Button>
              </FocusModal.Close>
            </div>
          </FocusModal.Header>
          <FocusModal.Body>
            <div className="flex flex-col p-6">
              {/* Mode Toggle */}
              <div className="flex gap-2 mb-6 pb-4 border-b border-ui-border-base">
                <Button
                  size="small"
                  variant={itemMode === 'catalog' ? 'primary' : 'secondary'}
                  onClick={() => handleItemModeChange('catalog')}
                >
                  From Product Catalog
                </Button>
                <Button
                  size="small"
                  variant={itemMode === 'manual' ? 'primary' : 'secondary'}
                  onClick={() => handleItemModeChange('manual')}
                >
                  Manual Item
                </Button>
              </div>

              <div className="w-full max-w-lg mx-auto">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Catalog Mode: Product Variant Selection */}
                  {itemMode === 'catalog' && (
                    <>
                      <div>
                        <Label size="small" weight="plus">Product Variant</Label>
                        <div className="mt-2">
                          {selectedVariant ? (
                            <div className="flex items-center justify-between p-3 border rounded-md bg-ui-bg-subtle">
                              <div className="flex-1">
                                <Text weight="plus" size="small">
                                  {selectedVariant.product.title}
                                  {selectedVariant.title !== 'Default' ? ` - ${selectedVariant.title}` : ''}
                                </Text>
                                <Text size="small" className="text-ui-fg-subtle">
                                  SKU: {selectedVariant.sku}
                                </Text>
                                {(() => {
                                  const eurPrice = selectedVariant.prices?.find(price => price.currency_code === 'eur')
                                  return eurPrice ? (
                                    <Text size="small" className="text-ui-fg-subtle">
                                      €{eurPrice.amount.toFixed(2)}
                                    </Text>
                                  ) : (
                                    <Text size="small" className="text-ui-fg-subtle text-ui-fg-muted">
                                      No EUR price set
                                    </Text>
                                  )
                                })()}
                              </div>
                              <Button
                                type="button"
                                variant="secondary"
                                size="small"
                                onClick={() => setShowProductSearch(true)}
                              >
                                Change
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => setShowProductSearch(true)}
                              className="w-full"
                            >
                              <MagnifyingGlass className="w-4 h-4 mr-2" />
                              Select Product Variant
                            </Button>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label size="small" weight="plus">Quantity Needed</Label>
                        <Input
                          type="number"
                          min="1"
                          value={formData.quantity_needed}
                          onChange={(e) => setFormData(prev => ({ ...prev, quantity_needed: parseInt(e.target.value) || 1 }))}
                          required
                        />
                      </div>

                      <div>
                        <Label size="small" weight="plus">Notes (optional)</Label>
                        <Textarea
                          placeholder="Additional notes about this item"
                          value={formData.notes}
                          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        />
                      </div>
                    </>
                  )}

                  {/* Manual Mode: Custom Entry Form */}
                  {itemMode === 'manual' && (
                    <>
                      <div>
                        <Label size="small" weight="plus">Title *</Label>
                        <Input
                          type="text"
                          placeholder="Item title"
                          value={formData.title}
                          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                          required
                        />
                      </div>

                      <div>
                        <Label size="small" weight="plus">Description</Label>
                        <Textarea
                          placeholder="Item description (optional)"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label size="small" weight="plus">SKU</Label>
                        <Input
                          type="text"
                          placeholder="SKU (optional)"
                          value={formData.sku}
                          onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label size="small" weight="plus">Quantity Needed *</Label>
                          <Input
                            type="number"
                            min="1"
                            value={formData.quantity_needed}
                            onChange={(e) => setFormData(prev => ({ ...prev, quantity_needed: parseInt(e.target.value) || 1 }))}
                            required
                          />
                        </div>

                        <div>
                          <Label size="small" weight="plus">Unit Price (€) *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.unit_price}
                            onChange={(e) => setFormData(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <Label size="small" weight="plus">Notes</Label>
                        <Textarea
                          placeholder="Additional notes about this item (optional)"
                          value={formData.notes}
                          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                          rows={2}
                        />
                      </div>
                    </>
                  )}

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowAddModal(false)}
                      disabled={addItemMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={addItemMutation.isPending || (itemMode === 'catalog' && !selectedVariant)}
                    >
                      {addItemMutation.isPending ? "Adding..." : "Add Item"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>

      {/* Product Search Modal */}
      <FocusModal open={showProductSearch} onOpenChange={setShowProductSearch}>
        <FocusModal.Content>
          <FocusModal.Header>
            <div className="flex items-center justify-between">
              <Heading level="h2">Select Product Variant</Heading>
              <FocusModal.Close asChild>
                <Button variant="secondary">Cancel</Button>
              </FocusModal.Close>
            </div>
          </FocusModal.Header>
          <FocusModal.Body>
            <div className="p-6">
              {productsLoading ? (
                <div className="text-center py-8">
                  <Text>Loading products...</Text>
                </div>
              ) : products?.products?.length === 0 ? (
                <div className="text-center py-8">
                  <Text className="text-ui-fg-muted">
                    {productSearch ? 'No products found' : 'No products available'}
                  </Text>
                </div>
              ) : (
                <ProductSearchDataTable 
                  products={products?.products || []} 
                  onVariantSelect={handleVariantSelect}
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

export default ServiceOrderItemsWidget