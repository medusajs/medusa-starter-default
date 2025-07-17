import { useState, useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { 
  Container, 
  Heading, 
  Button, 
  Badge,
  Table,
  Text,
  toast,
  FocusModal,
  Input,
  Textarea,
  Label,
  Select,
} from "@medusajs/ui"
import { Plus, DocumentText, ArrowUpTray, PencilSquare, Trash, ArrowDownTray, MagnifyingGlass } from "@medusajs/icons"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import * as zod from "zod"

interface PriceList {
  id: string
  name: string
  description?: string
  supplier_id: string
  effective_date?: Date
  expiry_date?: Date
  currency_code?: string
  is_active: boolean
  upload_filename?: string
  items_count?: number
  created_at: Date
  updated_at: Date
}

interface PriceListItem {
  id: string
  price_list_id: string
  product_id: string
  product_variant_id: string
  supplier_sku?: string
  variant_sku?: string
  cost_price: number
  quantity?: number
  lead_time_days?: number
  notes?: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

interface Supplier {
  id: string
  name: string
}

interface ProductVariant {
  id: string
  title: string
  sku: string | null
  product_id: string
  product?: {
    id: string
    title: string
  }
}

interface ProductSearchResult {
  id: string
  title: string
  variants: ProductVariant[]
}

const addItemSchema = zod.object({
  product_variant_id: zod.string().min(1, "Please select a product variant"),
  product_id: zod.string().min(1, "Product ID is required"),
  supplier_sku: zod.string().optional(),
  variant_sku: zod.string().optional(),
  cost_price: zod.number().min(0, "Cost price must be 0 or greater"),
  quantity: zod.number().min(1, "Quantity must be at least 1").default(1),
  lead_time_days: zod.number().min(0).optional(),
  notes: zod.string().optional()
}).refine((data) => {
  return data.product_variant_id && data.product_id
}, {
  message: "Valid product variant must be selected",
  path: ["product_variant_id"]
})

type AddItemFormData = zod.infer<typeof addItemSchema>

interface SupplierPriceListsProps {
  data: Supplier
}

export const SupplierPriceLists = ({ data: supplier }: SupplierPriceListsProps) => {
  const queryClient = useQueryClient()
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [productSearch, setProductSearch] = useState("")
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)

  const { data: priceListData, isLoading, error } = useQuery({
    queryKey: ["supplier-price-list", supplier?.id],
    queryFn: async () => {
      const response = await fetch(`/admin/suppliers/${supplier.id}/price-lists?include_items=true`)
      if (!response.ok) {
        throw new Error(`Failed to fetch price list: ${response.statusText}`)
      }
      return response.json()
    },
    enabled: !!supplier?.id,
  })

  const { data: productSearchResults, isLoading: isSearching } = useQuery({
    queryKey: ["product-search", productSearch],
    queryFn: async () => {
      if (!productSearch.trim()) return { products: [] }
      const response = await fetch(`/admin/products?q=${encodeURIComponent(productSearch)}&limit=20`)
      if (!response.ok) {
        throw new Error(`Failed to search products: ${response.statusText}`)
      }
      return response.json()
    },
    enabled: productSearch.trim().length > 0,
    staleTime: 300000, // 5 minutes
  })

  const addItemForm = useForm<AddItemFormData>({
    resolver: zodResolver(addItemSchema),
    defaultValues: {
      product_variant_id: "",
      product_id: "",
      supplier_sku: "",
      variant_sku: "",
      cost_price: 0,
      quantity: 1,
      lead_time_days: 0,
      notes: ""
    }
  })

  // Update form when variant is selected
  useEffect(() => {
    if (selectedVariant) {
      addItemForm.setValue("product_variant_id", selectedVariant.id)
      addItemForm.setValue("product_id", selectedVariant.product_id)
      addItemForm.setValue("variant_sku", selectedVariant.sku || "")
      addItemForm.trigger(["product_variant_id", "product_id"])
    }
  }, [selectedVariant, addItemForm])

  const addItemMutation = useMutation({
    mutationFn: async (data: AddItemFormData) => {
      const response = await fetch(`/admin/suppliers/${supplier.id}/price-lists/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Request failed: ${response.statusText}`)
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-price-list", supplier.id] })
      handleModalClose()
      toast.success("Item added successfully")
    },
    onError: (error) => {
      toast.error(`Failed to add item: ${error.message}`)
    }
  })

  const uploadCSVMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append("file", file)
      
      const response = await fetch(`/admin/suppliers/${supplier.id}/price-lists/import`, {
        method: "POST",
        body: formData,
      })
      if (!response.ok) {
        throw new Error("Failed to upload CSV")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-price-list", supplier.id] })
      setShowUploadModal(false)
      setUploadFile(null)
      toast.success("CSV uploaded successfully")
    },
    onError: (error) => {
      toast.error(`Failed to upload CSV: ${error.message}`)
    }
  })

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`/admin/suppliers/${supplier.id}/price-lists/items/${itemId}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        throw new Error("Failed to delete item")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-price-list", supplier.id] })
      toast.success("Item deleted successfully")
    },
    onError: (error) => {
      toast.error(`Failed to delete item: ${error.message}`)
    }
  })

  const handleAddItem = addItemForm.handleSubmit(async (data) => {
    // Additional validation
    if (!selectedVariant) {
      toast.error("Please select a product variant")
      return
    }
    
    // Check if item already exists
    const existingItems = priceListData?.items || []
    const existingItem = existingItems.find(item => 
      item.product_variant_id === data.product_variant_id
    )
    
    if (existingItem) {
      toast.error("This product variant is already in the price list")
      return
    }
    
    addItemMutation.mutate(data)
  })

  const handleModalClose = () => {
    setShowAddItemModal(false)
    setSelectedVariant(null)
    setProductSearch("")
    addItemForm.reset()
  }

  const handleUploadCSV = async () => {
    if (!uploadFile) return
    uploadCSVMutation.mutate(uploadFile)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadFile(file)
    }
  }

  const handleDownloadTemplate = () => {
    window.open(`/admin/suppliers/${supplier.id}/price-lists/template`, "_blank")
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price / 100)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString()
  }

  if (!supplier?.id) {
    return null
  }

  if (error) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Price Lists</Heading>
        </div>
        <div className="px-6 py-8 text-center">
          <Text className="text-ui-fg-error">Failed to load price lists</Text>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            {error.message}
          </Text>
        </div>
      </Container>
    )
  }

  const priceList = priceListData?.price_list || null
  const items = priceListData?.items || []

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <Heading level="h2">Price List</Heading>
            {priceList && (
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={priceList.is_active ? "green" : "red"}>
                  {priceList.is_active ? "Active" : "Inactive"}
                </Badge>
                <Text size="small" className="text-ui-fg-subtle">
                  Version {priceList.version || 1} • {items.length} items
                </Text>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="small" onClick={handleDownloadTemplate}>
              <ArrowDownTray />
              Template
            </Button>
            <Button variant="secondary" size="small" onClick={() => setShowUploadModal(true)}>
              <ArrowUpTray />
              Upload CSV
            </Button>
            <Button variant="primary" size="small" onClick={() => setShowAddItemModal(true)}>
              <Plus />
              Add Item
            </Button>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="px-6 py-8 text-center">
          <Text>Loading price list...</Text>
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="px-6 py-8 text-center">
          <DocumentText className="w-12 h-12 text-ui-fg-muted mx-auto mb-4" />
          <Text className="text-ui-fg-muted mb-2">No price list items found</Text>
          <Text size="small" className="text-ui-fg-subtle mb-4">
            Add items manually or upload a CSV file to get started
          </Text>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => setShowAddItemModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
            <Button variant="secondary" onClick={() => setShowUploadModal(true)}>
              <ArrowUpTray className="w-4 h-4 mr-2" />
              Upload CSV
            </Button>
          </div>
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="px-6 py-6">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Product SKU</Table.HeaderCell>
                <Table.HeaderCell>Supplier SKU</Table.HeaderCell>
                <Table.HeaderCell>Cost Price</Table.HeaderCell>
                <Table.HeaderCell>Quantity</Table.HeaderCell>
                <Table.HeaderCell>Lead Time</Table.HeaderCell>
                <Table.HeaderCell>Actions</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {items.map((item: PriceListItem) => (
                <Table.Row key={item.id}>
                  <Table.Cell>
                    <Text className="font-mono text-sm">{item.variant_sku}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text className="font-mono text-sm">{item.supplier_sku}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text className="font-medium">
                      {priceList?.currency_code || "USD"} {(item.cost_price / 100).toFixed(2)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text>{item.quantity}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text>{item.lead_time_days ? `${item.lead_time_days} days` : "—"}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="small">
                        <PencilSquare />
                      </Button>
                      <Button 
                        variant="danger" 
                        size="small" 
                        onClick={() => deleteItemMutation.mutate(item.id)}
                      >
                        <Trash />
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      )}

      {/* Single Add Item Modal */}
      <FocusModal open={showAddItemModal} onOpenChange={handleModalClose}>
        <FocusModal.Content>
          <FocusModal.Header>
            <Button 
              variant="primary" 
              size="small"
              onClick={handleAddItem}
              disabled={addItemMutation.isPending}
            >
              {addItemMutation.isPending ? "Adding..." : "Add Item"}
            </Button>
          </FocusModal.Header>
          <FocusModal.Body className="flex flex-col items-center p-16">
            <div className="w-full max-w-lg">
              <div className="mb-8 text-center">
                <Heading level="h2" className="mb-2">Add Price List Item</Heading>
                <Text className="text-ui-fg-subtle">
                  Add a new item to the price list
                </Text>
              </div>
              
              <form className="space-y-4">
                {/* Product Variant Selection */}
                <div className="flex flex-col gap-y-2">
                  <Label htmlFor="product_search">Search Products *</Label>
                  <div className="relative">
                    <Input
                      id="product_search"
                      placeholder="Search for products..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-10"
                    />
                    <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ui-fg-subtle w-4 h-4" />
                  </div>
                  
                  {/* Product Search Results */}
                  {productSearch.trim() && (
                    <div className="mt-2 border rounded-lg max-h-60 overflow-y-auto">
                      {isSearching ? (
                        <div className="p-4 text-center">
                          <Text size="small" className="text-ui-fg-subtle">Searching...</Text>
                        </div>
                      ) : (
                        <div className="divide-y">
                          {productSearchResults?.products?.map((product: any) => (
                            <div key={product.id} className="p-3">
                              <Text className="font-medium mb-2">{product.title}</Text>
                              <div className="space-y-1">
                                {product.variants?.map((variant: ProductVariant) => (
                                  <div 
                                    key={variant.id} 
                                    className={`p-2 rounded cursor-pointer transition-colors ${
                                      selectedVariant?.id === variant.id 
                                        ? 'bg-ui-bg-interactive text-ui-fg-on-color' 
                                        : 'hover:bg-ui-bg-subtle'
                                    }`}
                                    onClick={() => setSelectedVariant(variant)}
                                  >
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <Text size="small" className="font-medium">
                                          {variant.title}
                                        </Text>
                                        {variant.sku && (
                                          <Text size="xsmall" className="text-ui-fg-subtle">
                                            SKU: {variant.sku}
                                          </Text>
                                        )}
                                      </div>
                                      {selectedVariant?.id === variant.id && (
                                        <Badge color="green" size="small">Selected</Badge>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                          {productSearchResults?.products?.length === 0 && (
                            <div className="p-4 text-center">
                              <Text size="small" className="text-ui-fg-subtle">No products found</Text>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Selected Variant Display */}
                  {selectedVariant && (
                    <div className="mt-2 p-3 bg-ui-bg-subtle rounded-lg">
                      <Text size="small" className="text-ui-fg-subtle mb-1">Selected Product Variant:</Text>
                      <Text className="font-medium">{selectedVariant.product?.title || 'Unknown Product'}</Text>
                      <Text size="small">{selectedVariant.title}</Text>
                      {selectedVariant.sku && (
                        <Text size="xsmall" className="text-ui-fg-subtle">SKU: {selectedVariant.sku}</Text>
                      )}
                    </div>
                  )}
                  
                  <Controller
                    name="product_variant_id"
                    control={addItemForm.control}
                    render={({ fieldState }) => (
                      <>
                        {fieldState.error && (
                          <Text size="xsmall" className="text-ui-fg-error">
                            {fieldState.error.message}
                          </Text>
                        )}
                      </>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-y-2">
                    <Label htmlFor="supplier_sku">Supplier SKU</Label>
                    <Controller
                      name="supplier_sku"
                      control={addItemForm.control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          id="supplier_sku"
                          placeholder="Enter supplier SKU"
                        />
                      )}
                    />
                  </div>
                  <div className="flex flex-col gap-y-2">
                    <Label htmlFor="variant_sku">Variant SKU</Label>
                    <Controller
                      name="variant_sku"
                      control={addItemForm.control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          id="variant_sku"
                          placeholder="Enter variant SKU"
                        />
                      )}
                    />
                  </div>
                  <div className="flex flex-col gap-y-2">
                    <Label htmlFor="cost_price">Cost Price *</Label>
                    <Controller
                      name="cost_price"
                      control={addItemForm.control}
                      render={({ field, fieldState }) => (
                        <div className="flex flex-col gap-y-1">
                          <Input
                            {...field}
                            id="cost_price"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                          {fieldState.error && (
                            <Text size="xsmall" className="text-ui-fg-error">
                              {fieldState.error.message}
                            </Text>
                          )}
                        </div>
                      )}
                    />
                  </div>
                  <div className="flex flex-col gap-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Controller
                      name="quantity"
                      control={addItemForm.control}
                      render={({ field, fieldState }) => (
                        <div className="flex flex-col gap-y-1">
                          <Input
                            {...field}
                            id="quantity"
                            type="number"
                            min="1"
                            placeholder="1"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                          {fieldState.error && (
                            <Text size="xsmall" className="text-ui-fg-error">
                              {fieldState.error.message}
                            </Text>
                          )}
                        </div>
                      )}
                    />
                  </div>
                  <div className="flex flex-col gap-y-2">
                    <Label htmlFor="lead_time_days">Lead Time (Days)</Label>
                    <Controller
                      name="lead_time_days"
                      control={addItemForm.control}
                      render={({ field, fieldState }) => (
                        <div className="flex flex-col gap-y-1">
                          <Input
                            {...field}
                            id="lead_time_days"
                            type="number"
                            min="0"
                            placeholder="0"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                          {fieldState.error && (
                            <Text size="xsmall" className="text-ui-fg-error">
                              {fieldState.error.message}
                            </Text>
                          )}
                        </div>
                      )}
                    />
                  </div>
                  <div className="md:col-span-2 flex flex-col gap-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Controller
                      name="notes"
                      control={addItemForm.control}
                      render={({ field }) => (
                        <Textarea
                          {...field}
                          id="notes"
                          rows={3}
                          placeholder="Additional notes..."
                        />
                      )}
                    />
                  </div>
                </div>
              </form>
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>

      {/* Single Upload CSV Modal */}
      <FocusModal open={showUploadModal} onOpenChange={setShowUploadModal}>
        <FocusModal.Content>
          <FocusModal.Header>
            <Button 
              variant="primary" 
              size="small"
              onClick={handleUploadCSV} 
              disabled={!uploadFile || uploadCSVMutation.isPending}
            >
              {uploadCSVMutation.isPending ? "Uploading..." : "Upload & Replace"}
            </Button>
          </FocusModal.Header>
          <FocusModal.Body className="flex flex-col items-center p-16">
            <div className="w-full max-w-lg">
              <div className="mb-8 text-center">
                <Heading level="h2" className="mb-2">Upload Price List CSV</Heading>
                <Text className="text-ui-fg-subtle">
                  Upload a CSV file to overwrite existing prices. This will replace all current price list items.
                </Text>
              </div>
              
              <div className="space-y-4">
                <div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-ui-fg-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-ui-bg-subtle file:text-ui-fg-base hover:file:bg-ui-bg-subtle-hover"
                  />
                </div>
                {uploadFile && (
                  <div className="p-3 bg-ui-bg-subtle rounded-lg">
                    <Text className="text-sm">Selected file: {uploadFile.name}</Text>
                    <Text className="text-xs text-ui-fg-subtle">Size: {(uploadFile.size / 1024).toFixed(1)} KB</Text>
                  </div>
                )}
              </div>
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </Container>
  )
}

export default SupplierPriceLists