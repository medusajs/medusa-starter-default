import { useState, useEffect, useMemo } from "react"
import { useForm, Controller, FieldPath, useWatch } from "react-hook-form"
import { 
  Container, 
  Heading, 
  Button, 
  Badge,
  Text,
  toast,
  Input,
  Textarea,
  Label,
  Drawer,
  DropdownMenu,
  IconButton,
  DataTable,
  useDataTable,
  createDataTableColumnHelper,
  Checkbox,
  ProgressTabs,
  ProgressStatus,
  FocusModal,
} from "@medusajs/ui"
import { Plus, DocumentText, ArrowUpTray, PencilSquare, Trash, ArrowDownTray, EllipsisHorizontal, MagnifyingGlass } from "@medusajs/icons"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import * as zod from "zod"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { ProductSearchModal } from "./modals/product-search-modal"
import SupplierBrandSelect from "./common/supplier-brand-select"

interface PriceList {
  id: string
  name: string
  description?: string
  supplier_id: string
  brand_id?: string
  effective_date?: Date
  expiry_date?: Date
  currency_code?: string
  is_active: boolean
  upload_filename?: string
  items_count?: number
  brand?: {
    id: string
    name: string
    code: string
  }
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
  product?: {
    id: string
    title: string
  }
  gross_price?: number
  discount_percentage?: number
  net_price: number
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

const addItemSchema = zod.object({
  supplier_sku: zod.string().optional(),
  gross_price: zod.number().min(0, "Gross price must be 0 or greater").optional(),
  discount_percentage: zod.number().min(0, "Discount percentage must be 0 or greater").max(100, "Discount percentage cannot exceed 100").optional(),
  net_price: zod.number().min(0, "Net price must be 0 or greater").refine(val => val > 0, "Net price is required"),
  quantity: zod.number().min(1, "Quantity must be at least 1").default(1),
  lead_time_days: zod.number().min(0).optional(),
  notes: zod.string().optional()
})

type AddItemFormData = zod.infer<typeof addItemSchema>

interface SupplierPriceListsProps {
  data: Supplier
}

export const SupplierPriceLists = ({ data: supplier }: SupplierPriceListsProps) => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showEditDrawer, setShowEditDrawer] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<PriceListItem | null>(null)
  const [selectedVariantForAdd, setSelectedVariantForAdd] = useState<SelectedVariantForPricing | null>(null)
  const [productSearchOpen, setProductSearchOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [tableSearch, setTableSearch] = useState("")
  const [brandFilter, setBrandFilter] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const editItemForm = useForm<AddItemFormData>({
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

  const { data: priceListData, isLoading, error } = useQuery({
    queryKey: ["supplier-price-list", supplier?.id, brandFilter],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        include_items: "true",
        ...(brandFilter && { brand_id: brandFilter })
      })
      const response = await fetch(`/admin/suppliers/${supplier.id}/price-lists?${queryParams}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch price list: ${response.statusText}`)
      }
      return response.json()
    },
    enabled: !!supplier?.id,
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

  const editItemMutation = useMutation({
    mutationFn: async (data: AddItemFormData & { itemId: string }) => {
      const { itemId, ...updateData } = data
      const priceList = priceListData?.price_list
      if (!priceList) {
        throw new Error("No active price list found")
      }
      const response = await fetch(`/admin/suppliers/${supplier.id}/price-lists/${priceList.id}/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Request failed: ${response.statusText}`)
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-price-list", supplier.id] })
      handleEditDrawerClose()
      toast.success("Item updated successfully")
    },
    onError: (error) => {
      toast.error(`Failed to update item: ${error.message}`)
    }
  })

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const priceList = priceListData?.price_list
      if (!priceList) {
        throw new Error("No active price list found")
      }
      const response = await fetch(`/admin/suppliers/${supplier.id}/price-lists/${priceList.id}/items/${itemId}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Request failed: ${response.statusText}`)
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

  // Simple form for adding items manually
  const addItemForm = useForm<AddItemFormData>({
    resolver: zodResolver(addItemSchema),
    defaultValues: {
      supplier_sku: "",
      gross_price: undefined,
      discount_percentage: undefined,
      net_price: 0,
      quantity: 1,
      lead_time_days: 0,
      notes: ""
    }
  })

  const addItemMutation = useMutation({
    mutationFn: async (data: AddItemFormData) => {
      if (!selectedVariantForAdd) {
        throw new Error("Please select a product variant")
      }
      const priceList = priceListData?.price_list
      if (!priceList) {
        throw new Error("No active price list found")
      }
      const response = await fetch(`/admin/suppliers/${supplier.id}/price-lists/${priceList.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          product_variant_id: selectedVariantForAdd.id,
          product_id: selectedVariantForAdd.product_id,
          // gross_price not persisted in current schema; keep client-side only
          net_price: data.net_price && !isNaN(data.net_price) ? Math.round(data.net_price * 100) : 0
        }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Request failed: ${response.statusText}`)
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-price-list", supplier.id] })
      setShowAddModal(false)
      addItemForm.reset()
      toast.success("Item added successfully")
    },
    onError: (error) => {
      toast.error(`Failed to add item: ${error.message}`)
    }
  })

  const handleAddItem = () => {
    setShowAddModal(true)
  }

  const handleAddModalClose = () => {
    setShowAddModal(false)
    addItemForm.reset()
    setSelectedVariantForAdd(null)
  }

  const handleProductSelect = (variant: SelectedVariantForPricing) => {
    setSelectedVariantForAdd(variant)
  }

  const handleSubmitAddItem = addItemForm.handleSubmit(async (data) => {
    if (!selectedVariantForAdd) {
      toast.error("Please select a product variant")
      return
    }
    addItemMutation.mutate(data)
  })

  const handleEditDrawerClose = () => {
    setShowEditDrawer(false)
    setEditingItem(null)
    editItemForm.reset()
  }

  const handleEditItem = (item: PriceListItem) => {
    setEditingItem(item)
    editItemForm.reset({
      variant_id: item.product_variant_id,
      supplier_sku: item.supplier_sku || "",
      gross_price: item.gross_price ? item.gross_price / 100 : undefined,
      discount_percentage: item.discount_percentage || undefined,
      net_price: item.net_price / 100,
      quantity: item.quantity || 1,
      lead_time_days: item.lead_time_days || 0,
      notes: item.notes || ""
    })
    setShowEditDrawer(true)
  }

  const handleUpdateItem = editItemForm.handleSubmit(async (data) => {
    if (!editingItem) return

    // Convert prices to cents for storage
    const processedData = {
      ...data,
      itemId: editingItem.id,
      product_variant_id: data.variant_id,
      gross_price: data.gross_price ? Math.round(data.gross_price * 100) : undefined,
      net_price: Math.round(data.net_price * 100)
    }

    editItemMutation.mutate(processedData)
  })

  const handleDeleteItem = async (itemId: string) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      deleteItemMutation.mutate(itemId)
    }
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

  // DataTable configuration
  const items = priceListData?.items || []
  const priceList = priceListData?.price_list || null

  // Filter items based on search
  const filteredItems = items.filter(item => {
    if (!tableSearch) return true
    const search = tableSearch.toLowerCase()
    return (
      item.supplier_sku?.toLowerCase().includes(search) ||
      item.notes?.toLowerCase().includes(search) ||
      item.product?.title?.toLowerCase().includes(search)
    )
  })

  const columnHelper = createDataTableColumnHelper<PriceListItem>()

  const columns = [
    columnHelper.display({
      id: "variant_info",
      header: "Product",
      cell: ({ row }) => {
        const item = row.original
        return (
          <div className="flex flex-col gap-1">
            <Text className="font-medium text-sm">
              {item.product?.title || "Product"}
            </Text>
            {item.variant_sku && (
              <Text className="font-mono text-xs text-ui-fg-subtle">
                SKU: {item.variant_sku}
              </Text>
            )}
          </div>
        )
      },
    }),
    columnHelper.accessor("supplier_sku", {
      header: "Supplier SKU", 
      cell: ({ getValue }) => (
        <Text className="font-mono text-sm">{getValue() || "—"}</Text>
      ),
    }),
    columnHelper.accessor("gross_price", {
      header: "Gross Price",
      cell: ({ getValue }) => (
        <Text className="font-medium">
          {getValue() ? `${priceList?.currency_code || "USD"} ${(getValue() / 100).toFixed(2)}` : "—"}
        </Text>
      ),
    }),
    columnHelper.accessor("discount_percentage", {
      header: "Discount",
      cell: ({ getValue }) => (
        <Text>
          {getValue() ? `${getValue()}%` : "—"}
        </Text>
      ),
    }),
    columnHelper.accessor("net_price", {
      header: "Net Price",
      cell: ({ getValue }) => (
        <Text className="font-medium">
          {priceList?.currency_code || "USD"} {(getValue() / 100).toFixed(2)}
        </Text>
      ),
    }),
    columnHelper.accessor("quantity", {
      header: "Quantity",
      cell: ({ getValue }) => <Text>{getValue() || 1}</Text>,
    }),
    columnHelper.accessor("lead_time_days", {
      header: "Lead Time",
      cell: ({ getValue }) => (
        <Text>{getValue() ? `${getValue()} days` : "—"}</Text>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenu.Trigger asChild>
            <IconButton variant="transparent">
              <EllipsisHorizontal />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item onClick={() => handleEditItem(row.original)}>
              <PencilSquare className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item 
              onClick={() => handleDeleteItem(row.original.id)}
              className="text-ui-fg-error"
            >
              <Trash className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
      ),
    }),
  ]

  const table = useDataTable({
    data: filteredItems,
    columns,
    rowCount: filteredItems.length,
    getRowId: (row) => row.id,
    isLoading,
    search: {
      state: tableSearch,
      onSearchChange: setTableSearch,
    },
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
  })

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

  return (
    <Container className="divide-y p-0">
      <DataTable instance={table}>
        <DataTable.Toolbar>
          <div className="flex items-center justify-between w-full">
            <div>
              <Heading level="h2">Price List</Heading>
              {priceList && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={priceList.is_active ? "green" : "red"}>
                    {priceList.is_active ? "Active" : "Inactive"}
                  </Badge>
                  {priceList.brand && (
                    <Badge variant="grey">
                      {priceList.brand.name} ({priceList.brand.code})
                    </Badge>
                  )}
                  <Text size="small" className="text-ui-fg-subtle">
                    Version {priceList.version || 1} • {filteredItems.length} items
                  </Text>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-48">
                <SupplierBrandSelect
                  supplierId={supplier.id}
                  value={brandFilter}
                  onChange={setBrandFilter}
                  includeNoneOption
                  placeholder="Filter by brand..."
                />
              </div>
              <DataTable.Search placeholder="Search price list items..." />
              <Button variant="secondary" size="small" onClick={handleDownloadTemplate}>
                <ArrowDownTray />
                Template
              </Button>
              <Button variant="secondary" size="small" onClick={() => setShowUploadModal(true)}>
                <ArrowUpTray />
                Upload CSV
              </Button>
              <Button variant="primary" size="small" onClick={handleAddItem}>
                <Plus />
                Add Item
              </Button>
            </div>
          </div>
        </DataTable.Toolbar>

        {!isLoading && items.length === 0 && (
          <div className="px-6 py-16 text-center">
            <DocumentText className="w-12 h-12 text-ui-fg-muted mx-auto mb-4" />
            <Text className="text-ui-fg-muted mb-2">No price list items found</Text>
            <Text size="small" className="text-ui-fg-subtle mb-4">
              Add items manually or upload a CSV file to get started
            </Text>
            <div className="flex gap-2 justify-center">
              <Button onClick={handleAddItem}>
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

        {(items.length > 0 || isLoading) && (
          <>
            <DataTable.Table />
            <DataTable.Pagination />
          </>
        )}
      </DataTable>


      {/* Single Upload CSV Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Upload Price List CSV</h2>
                <Button variant="secondary" size="small" onClick={() => setShowUploadModal(false)}>
                  Cancel
                </Button>
              </div>
            </div>
            
            <div className="p-6">
              <Text className="text-ui-fg-subtle mb-4">
                Upload a CSV file to overwrite existing prices. This will replace all current price list items.
              </Text>
              
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
            
            <div className="p-6 border-t flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowUploadModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUploadCSV} 
                disabled={!uploadFile || uploadCSVMutation.isPending}
                isLoading={uploadCSVMutation.isPending}
              >
                Upload & Replace
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      <FocusModal open={showAddModal} onOpenChange={setShowAddModal}>
        <FocusModal.Trigger asChild>
          <div />
        </FocusModal.Trigger>
        <FocusModal.Content>
          <FocusModal.Header>
            <FocusModal.Title>Add Price List Item</FocusModal.Title>
            <FocusModal.Description>
              Add a new item to the price list with pricing information
            </FocusModal.Description>
          </FocusModal.Header>
          <FocusModal.Body className="p-6">
            <form onSubmit={handleSubmitAddItem} className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Product Search *</Label>
                  <div className="relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-fg-muted" />
                    <Input
                      placeholder="Search for a product to add..."
                      value={selectedVariantForAdd ? `${selectedVariantForAdd.product?.title} - ${selectedVariantForAdd.title}` : ""}
                      onClick={() => setProductSearchOpen(true)}
                      readOnly
                      className="pl-9 cursor-pointer"
                    />
                  </div>
                  <Text size="small" className="text-ui-fg-subtle">
                    Click to search and select a product variant
                  </Text>
                </div>
                
                {selectedVariantForAdd && (
                  <div className="p-4 bg-ui-bg-subtle rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <Text className="font-medium">{selectedVariantForAdd.product?.title}</Text>
                        <Text size="small" className="text-ui-fg-subtle">{selectedVariantForAdd.title}</Text>
                        {selectedVariantForAdd.sku && (
                          <Text size="xsmall" className="text-ui-fg-muted">SKU: {selectedVariantForAdd.sku}</Text>
                        )}
                      </div>
                      <Button
                        variant="secondary"
                        size="small"
                        type="button"
                        onClick={() => setSelectedVariantForAdd(null)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-y-2">
                  <Label htmlFor="add_supplier_sku">Supplier SKU</Label>
                  <Controller
                    name="supplier_sku"
                    control={addItemForm.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="add_supplier_sku"
                        placeholder="Enter supplier SKU (optional)"
                      />
                    )}
                  />
                </div>
                <div className="flex flex-col gap-y-2">
                  <Label htmlFor="add_gross_price">Gross Price (RRP)</Label>
                  <Controller
                    name="gross_price"
                    control={addItemForm.control}
                    render={({ field, fieldState }) => (
                      <div className="flex flex-col gap-y-1">
                        <Input
                          {...field}
                          id="add_gross_price"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
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
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-y-2">
                  <Label htmlFor="add_discount_percentage">Discount %</Label>
                  <Controller
                    name="discount_percentage"
                    control={addItemForm.control}
                    render={({ field, fieldState }) => (
                      <div className="flex flex-col gap-y-1">
                        <Input
                          {...field}
                          id="add_discount_percentage"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0.00"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
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
                  <Label htmlFor="add_net_price">Net Price (What You Pay) *</Label>
                  <Controller
                    name="net_price"
                    control={addItemForm.control}
                    render={({ field, fieldState }) => (
                      <div className="flex flex-col gap-y-1">
                        <Input
                          {...field}
                          id="add_net_price"
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
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-y-2">
                  <Label htmlFor="add_quantity">Minimum Order Quantity</Label>
                  <Controller
                    name="quantity"
                    control={addItemForm.control}
                    render={({ field, fieldState }) => (
                      <div className="flex flex-col gap-y-1">
                        <Input
                          {...field}
                          id="add_quantity"
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
                  <Label htmlFor="add_lead_time_days">Lead Time (Days)</Label>
                  <Controller
                    name="lead_time_days"
                    control={addItemForm.control}
                    render={({ field, fieldState }) => (
                      <div className="flex flex-col gap-y-1">
                        <Input
                          {...field}
                          id="add_lead_time_days"
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
              </div>
              
              <div className="flex flex-col gap-y-2">
                <Label htmlFor="add_notes">Notes</Label>
                <Controller
                  name="notes"
                  control={addItemForm.control}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      id="add_notes"
                      rows={3}
                      placeholder="Additional notes about this item..."
                    />
                  )}
                />
              </div>
            </form>
          </FocusModal.Body>
          <FocusModal.Footer>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={handleAddModalClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitAddItem}
                disabled={addItemMutation.isPending || !selectedVariantForAdd}
                isLoading={addItemMutation.isPending}
              >
                Add Item
              </Button>
            </div>
          </FocusModal.Footer>
        </FocusModal.Content>
      </FocusModal>

      {/* Edit Item Drawer */}
      <Drawer open={showEditDrawer} onOpenChange={setShowEditDrawer}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Edit Price List Item</Drawer.Title>
            <Drawer.Description>
              Update the pricing information for this item
            </Drawer.Description>
          </Drawer.Header>
          <Drawer.Body className="p-6">
            <form onSubmit={handleUpdateItem} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-y-2">
                  <Label htmlFor="edit_supplier_sku">Supplier SKU</Label>
                  <Controller
                    name="supplier_sku"
                    control={editItemForm.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="edit_supplier_sku"
                        placeholder="Enter supplier SKU (optional)"
                      />
                    )}
                  />
                </div>
                <div className="flex flex-col gap-y-2">
                  <Label htmlFor="edit_gross_price">Gross Price (RRP)</Label>
                  <Controller
                    name="gross_price"
                    control={editItemForm.control}
                    render={({ field, fieldState }) => (
                      <div className="flex flex-col gap-y-1">
                        <Input
                          {...field}
                          id="edit_gross_price"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
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
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-y-2">
                  <Label htmlFor="edit_discount_percentage">Discount %</Label>
                  <Controller
                    name="discount_percentage"
                    control={editItemForm.control}
                    render={({ field, fieldState }) => (
                      <div className="flex flex-col gap-y-1">
                        <Input
                          {...field}
                          id="edit_discount_percentage"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0.00"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
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
                  <Label htmlFor="edit_net_price">Net Price (What You Pay) *</Label>
                  <Controller
                    name="net_price"
                    control={editItemForm.control}
                    render={({ field, fieldState }) => (
                      <div className="flex flex-col gap-y-1">
                        <Input
                          {...field}
                          id="edit_net_price"
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
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-y-2">
                  <Label htmlFor="edit_quantity">Minimum Order Quantity</Label>
                  <Controller
                    name="quantity"
                    control={editItemForm.control}
                    render={({ field, fieldState }) => (
                      <div className="flex flex-col gap-y-1">
                        <Input
                          {...field}
                          id="edit_quantity"
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
                  <Label htmlFor="edit_lead_time_days">Lead Time (Days)</Label>
                  <Controller
                    name="lead_time_days"
                    control={editItemForm.control}
                    render={({ field, fieldState }) => (
                      <div className="flex flex-col gap-y-1">
                        <Input
                          {...field}
                          id="edit_lead_time_days"
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
              </div>
              
              <div className="flex flex-col gap-y-2">
                <Label htmlFor="edit_notes">Notes</Label>
                <Controller
                  name="notes"
                  control={editItemForm.control}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      id="edit_notes"
                      rows={3}
                      placeholder="Additional notes about this item..."
                    />
                  )}
                />
              </div>
            </form>
          </Drawer.Body>
          <Drawer.Footer>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={handleEditDrawerClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateItem}
                disabled={editItemMutation.isPending}
                isLoading={editItemMutation.isPending}
              >
                Update Item
              </Button>
            </div>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
      
      <ProductSearchModal
        open={productSearchOpen}
        onOpenChange={setProductSearchOpen}
        onSelect={handleProductSelect}
        selectedVariant={selectedVariantForAdd}
      />
    </Container>
  )
}

export default SupplierPriceLists