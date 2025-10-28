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
  variant?: {
    id: string
    title: string
    sku?: string
  }
  gross_price?: number
  discount_code?: string
  discount_percentage?: number
  net_price: number
  quantity?: number
  lead_time_days?: number
  notes?: string
  description?: string
  category?: string
  is_active: boolean
  created_at: Date
  updated_at: Date
  // Sync tracking fields
  last_synced_at?: Date
  sync_status?: string // 'pending' | 'synced' | 'error' | 'skipped'
  sync_error?: string
}

interface Supplier {
  id: string
  name: string
  metadata?: {
    discount_structure?: {
      type: string
      mappings?: Record<string, number>
      default_percentage?: number
    }
  }
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
  variant_sku: zod.string().optional(),
  product_name: zod.string().optional(),
  description: zod.string().optional(),
  category: zod.string().optional(),
  gross_price: zod.number().min(0, "Gross price must be 0 or greater").optional(),
  discount_percentage: zod.number().min(0, "Discount percentage must be 0 or greater").max(100, "Discount percentage cannot exceed 100").default(0),
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
  const [itemEntryType, setItemEntryType] = useState<'catalog' | 'manual'>('catalog')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [tableSearch, setTableSearch] = useState("")
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [isSyncingPrices, setIsSyncingPrices] = useState(false)
  // Preview state for parser preview functionality
  const [uploadPreview, setUploadPreview] = useState<any>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [currentParserConfig, setCurrentParserConfig] = useState<any>(null)

  const editItemForm = useForm<AddItemFormData>({
    resolver: zodResolver(addItemSchema),
    defaultValues: {
      supplier_sku: "",
      variant_sku: "",
      product_name: "",
      description: "",
      category: "",
      gross_price: undefined,
      discount_percentage: 0,
      quantity: 1,
      lead_time_days: 0,
      notes: ""
    }
  })

  const { data: priceListData, isLoading, error } = useQuery({
    queryKey: ["supplier-price-list", supplier?.id],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        include_items: "true"
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
      variant_sku: "",
      product_name: "",
      description: "",
      category: "",
      gross_price: undefined,
      discount_percentage: 0,
      quantity: 1,
      lead_time_days: 0,
      notes: ""
    }
  })

  // Watch gross_price and discount_percentage to calculate net_price
  const watchGrossPrice = useWatch({ control: addItemForm.control, name: "gross_price" })
  const watchDiscount = useWatch({ control: addItemForm.control, name: "discount_percentage" })

  // Calculate net price based on gross and discount
  const calculatedNetPrice = useMemo(() => {
    if (!watchGrossPrice || watchGrossPrice <= 0) return 0
    const discount = watchDiscount || 0
    return watchGrossPrice * (1 - discount / 100)
  }, [watchGrossPrice, watchDiscount])

  const addItemMutation = useMutation({
    mutationFn: async (data: AddItemFormData) => {
      const priceList = priceListData?.price_list
      if (!priceList) {
        throw new Error("No active price list found")
      }

      // Determine variant and product IDs based on entry type
      let productVariantId: string
      let productId: string
      let variantSku: string | undefined

      if (itemEntryType === 'catalog') {
        // Catalog entry - require selected variant
        if (!selectedVariantForAdd) {
          throw new Error("Please select a product variant")
        }
        productVariantId = selectedVariantForAdd.id
        productId = selectedVariantForAdd.product_id
        variantSku = data.variant_sku || selectedVariantForAdd.sku
      } else {
        // Manual entry - require product name and use supplier SKU as identifier
        if (!data.product_name || data.product_name.trim() === "") {
          throw new Error("Product name is required for manual entries")
        }
        if (!data.supplier_sku || data.supplier_sku.trim() === "") {
          throw new Error("Supplier SKU is required for manual entries")
        }
        // Use supplier_sku as the unique identifier for both product and variant
        productVariantId = `manual-${data.supplier_sku}`
        productId = `manual-${data.supplier_sku}`
        variantSku = data.variant_sku
      }

      // Calculate net price from gross and discount
      const netPrice = calculatedNetPrice > 0 ? Math.round(calculatedNetPrice * 100) : 0

      const response = await fetch(`/admin/suppliers/${supplier.id}/price-lists/${priceList.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_sku: data.supplier_sku,
          variant_sku: variantSku,
          description: data.description,
          category: data.category,
          gross_price: data.gross_price ? Math.round(data.gross_price * 100) : undefined,
          discount_percentage: data.discount_percentage,
          net_price: netPrice,
          quantity: data.quantity,
          lead_time_days: data.lead_time_days,
          notes: data.notes,
          product_variant_id: productVariantId,
          product_id: productId,
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
    setItemEntryType('catalog')
  }

  const handleProductSelect = (variant: SelectedVariantForPricing) => {
    setSelectedVariantForAdd(variant)
  }

  const handleSubmitAddItem = addItemForm.handleSubmit(async (data) => {
    if (itemEntryType === 'catalog' && !selectedVariantForAdd) {
      toast.error("Please select a product variant")
      return
    }
    if (itemEntryType === 'manual') {
      if (!data.product_name || data.product_name.trim() === "") {
        toast.error("Product name is required for manual entries")
        return
      }
      if (!data.supplier_sku || data.supplier_sku.trim() === "") {
        toast.error("Supplier SKU is required for manual entries")
        return
      }
      if (!data.gross_price || data.gross_price <= 0) {
        toast.error("Gross price is required for manual entries")
        return
      }
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
      supplier_sku: item.supplier_sku || "",
      variant_sku: item.variant_sku || "",
      description: item.description || "",
      category: item.category || "",
      gross_price: item.gross_price ? item.gross_price / 100 : undefined,
      discount_percentage: item.discount_percentage || 0,
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
      gross_price: data.gross_price ? Math.round(data.gross_price * 100) : undefined,
      discount_percentage: data.discount_percentage,
      description: data.description,
      category: data.category,
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const content = await file.text()

      // Get current parser config for supplier
      const configResponse = await fetch(`/admin/suppliers/${supplier.id}/parser-config`)
      const configData = await configResponse.json()
      const parserConfig = configData.parser_config || {
        type: 'csv',
        config: { delimiter: ',', has_header: true, skip_rows: 0, column_mapping: {} }
      }

      // Call preview endpoint
      const response = await fetch(
        `/admin/suppliers/${supplier.id}/parser-config/preview`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_content: content,
            config: parserConfig
          })
        }
      )

      if (!response.ok) {
        throw new Error('Preview failed')
      }

      const preview = await response.json()
      setUploadPreview({ file, content, preview })
      setCurrentParserConfig(parserConfig)
      setShowPreview(true)
    } catch (error) {
      console.error('Preview error:', error)
      // Fallback to direct upload
      setUploadFile(file)
      toast.error('Preview failed, file selected for direct upload')
    }
  }

  const handleDownloadTemplate = () => {
    window.open(`/admin/suppliers/${supplier.id}/price-lists/template`, "_blank")
  }

  const handleManualSync = async () => {
    if (!priceList) {
      toast.error("No price list found")
      return
    }

    setIsSyncingPrices(true)
    try {
      const response = await fetch(`/admin/suppliers/${supplier.id}/price-lists/${priceList.id}/sync-prices`, {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to sync prices")
      }

      const result = await response.json()
      queryClient.invalidateQueries({ queryKey: ["supplier-price-list", supplier.id] })

      toast.success(
        `Prices synced successfully: ${result.synced || 0} synced, ${result.failed || 0} failed, ${result.skipped || 0} skipped`
      )
    } catch (error: any) {
      toast.error(`Failed to sync prices: ${error.message}`)
    } finally {
      setIsSyncingPrices(false)
    }
  }

  const confirmUpload = async () => {
    if (!uploadPreview) return

    try {
      const formData = new FormData()
      formData.append('file', uploadPreview.file)
      formData.append('file_name', uploadPreview.file.name)

      const response = await fetch(
        `/admin/suppliers/${supplier.id}/price-lists/import`,
        {
          method: 'POST',
          body: formData,
        }
      )

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()

      // Show success message with import summary
      toast.success(
        `Price list imported successfully. ${result.import_summary?.success_count || 0} items processed, ${result.import_summary?.error_count || 0} errors.`
      )

      // Close preview and refresh data
      setShowPreview(false)
      setUploadPreview(null)
      setShowUploadModal(false)
      queryClient.invalidateQueries({ queryKey: ["supplier-price-list", supplier.id] })

    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(`Failed to upload price list: ${error.message}`)
    }
  }

  const getSyncStatusBadge = (item: PriceListItem) => {
    if (!item.sync_status) {
      return <Badge color="grey">Not Synced</Badge>
    }

    switch (item.sync_status) {
      case "synced":
        return (
          <div className="flex flex-col gap-1">
            <Badge color="green">Synced</Badge>
            {item.last_synced_at && (
              <Text size="xsmall" className="text-ui-fg-muted">
                {new Date(item.last_synced_at).toLocaleString()}
              </Text>
            )}
          </div>
        )
      case "error":
        return (
          <div className="flex flex-col gap-1">
            <Badge color="red" title={item.sync_error || "Unknown error"}>
              Failed
            </Badge>
            {item.sync_error && item.sync_error.length > 0 && (
              <Text size="xsmall" className="text-ui-fg-error">
                {item.sync_error.substring(0, 50)}...
              </Text>
            )}
          </div>
        )
      case "skipped":
        return (
          <Badge color="grey" title={item.sync_error || "Skipped"}>
            Skipped
          </Badge>
        )
      case "pending":
        return <Badge color="blue">Pending</Badge>
      default:
        return <Badge color="grey">Unknown</Badge>
    }
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
    columnHelper.accessor("product.title", {
      header: "Product",
      cell: ({ getValue, row }) => (
        <Text className="font-medium text-sm">
          {getValue() || row.original.description || "—"}
        </Text>
      ),
    }),
    columnHelper.display({
      id: "variant_title",
      header: "Variant",
      cell: ({ row }) => {
        const item = row.original
        const variantTitle = item.variant?.title
        const isManual = item.product_variant_id?.startsWith("manual-")

        return (
          <Text className="text-sm">
            {isManual ? "Manual Entry" : variantTitle || "—"}
          </Text>
        )
      },
    }),
    columnHelper.accessor("variant_sku", {
      header: "SKU",
      cell: ({ getValue, row }) => (
        <Text className="font-mono text-sm">
          {getValue() || row.original.variant?.sku || "—"}
        </Text>
      ),
    }),
    columnHelper.accessor("supplier_sku", {
      header: "Supplier SKU",
      cell: ({ getValue }) => (
        <Text className="font-mono text-sm">{getValue() || "—"}</Text>
      ),
    }),
    columnHelper.accessor("gross_price", {
      header: "Gross Price",
      cell: ({ getValue }) => {
        const value = getValue()
        if (!value) return <Text className="font-medium">—</Text>
        return (
          <Text className="font-medium">
            {priceList?.currency_code || "USD"} {(value / 100).toFixed(2)}
          </Text>
        )
      },
    }),
    columnHelper.display({
      id: "discount",
      header: "Discount",
      cell: ({ row }) => {
        const item = row.original
        const discountValue = typeof item.discount_percentage === 'number'
          ? item.discount_percentage
          : parseFloat(item.discount_percentage)
        const hasValidDiscount = !isNaN(discountValue) && discountValue !== null && discountValue !== undefined

        return (
          <div className="flex flex-col gap-1">
            {item.discount_code && (
              <Badge color="blue" size="small">{item.discount_code}</Badge>
            )}
            {hasValidDiscount && (
              <Text className="text-sm">{discountValue.toFixed(1)}%</Text>
            )}
            {!item.discount_code && !hasValidDiscount && (
              <Text>—</Text>
            )}
          </div>
        )
      },
    }),
    columnHelper.accessor("net_price", {
      header: "Net Price",
      cell: ({ getValue }) => (
        <Text className="font-medium text-green-600">
          {priceList?.currency_code || "USD"} {(getValue() / 100).toFixed(2)}
        </Text>
      ),
    }),
    columnHelper.accessor("lead_time_days", {
      header: "Lead Time",
      cell: ({ getValue }) => (
        <Text>{getValue() ? `${getValue()}d` : "—"}</Text>
      ),
    }),
    columnHelper.display({
      id: "sync_status",
      header: "Sync Status",
      cell: ({ row }) => getSyncStatusBadge(row.original),
    }),
    columnHelper.display({
      id: "actions",
      header: "",
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
                  <Badge color={priceList.is_active ? "green" : "red"}>
                    {priceList.is_active ? "Active" : "Inactive"}
                  </Badge>
                  {priceList.brand && (
                    <Badge color="grey">
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
              <DataTable.Search placeholder="Search price list items..." />
              <Button variant="secondary" size="small" onClick={handleDownloadTemplate}>
                <ArrowDownTray />
                Template
              </Button>
              <Button variant="secondary" size="small" onClick={() => setShowUploadModal(true)}>
                <ArrowUpTray />
                Upload CSV
              </Button>
              <Button
                variant="secondary"
                size="small"
                onClick={handleManualSync}
                disabled={isSyncingPrices || !priceList}
                isLoading={isSyncingPrices}
              >
                Sync Prices to Variants
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
      {showUploadModal && !showPreview && (
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
                Upload a CSV file to preview and import prices. This will replace all current price list items.
              </Text>

              <div className="space-y-4">
                <div>
                  <input
                    type="file"
                    accept=".csv,.txt"
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

      {/* Preview Dialog */}
      {showPreview && uploadPreview && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl my-8 mx-4">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Preview Import</h2>
              <Text className="text-sm text-ui-fg-subtle mt-1">
                Review the parsed data before confirming the import
              </Text>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Field Detection Status */}
              <div>
                <h3 className="text-md font-medium mb-2">Detected Fields</h3>
                <div className="flex flex-wrap gap-2">
                  {uploadPreview.preview.detected_fields?.map((field: string) => (
                    <Badge key={field} color="green">{field}</Badge>
                  ))}
                </div>
              </div>

              {/* Warnings */}
              {uploadPreview.preview.warnings && uploadPreview.preview.warnings.length > 0 && (
                <div>
                  <h3 className="text-md font-medium mb-2 text-yellow-600">Warnings</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {uploadPreview.preview.warnings.map((warning: string, index: number) => (
                      <li key={index} className="text-yellow-600 text-sm">{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Errors */}
              {uploadPreview.preview.errors && uploadPreview.preview.errors.length > 0 && (
                <div>
                  <h3 className="text-md font-medium mb-2 text-red-600">Errors</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {uploadPreview.preview.errors.map((error: string, index: number) => (
                      <li key={index} className="text-red-600 text-sm">{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview Table */}
              <div>
                <h3 className="text-md font-medium mb-2">Preview Data (First 10 rows)</h3>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Supplier SKU
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Variant SKU
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cost Price
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {uploadPreview.preview.preview_rows?.map((row: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900">{row.supplier_sku || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{row.variant_sku || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {row.cost_price ? `€${(row.cost_price / 100).toFixed(2)}` : '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">{row.description || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{row.quantity || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-2">
              <Button variant="secondary" onClick={() => {
                setShowPreview(false)
                setUploadPreview(null)
              }}>
                Cancel
              </Button>
              <Button variant="secondary" onClick={() => {
                setShowPreview(false)
                navigate(`/suppliers/${supplier.id}/settings`)
              }}>
                Configure Parser
              </Button>
              <Button onClick={confirmUpload}>
                Confirm Upload
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
              {/* Item Entry Type Toggle */}
              <div className="space-y-2">
                <Label>Entry Type</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={itemEntryType === 'catalog' ? 'primary' : 'secondary'}
                    size="small"
                    onClick={() => {
                      setItemEntryType('catalog')
                      setSelectedVariantForAdd(null)
                    }}
                  >
                    From Catalog
                  </Button>
                  <Button
                    type="button"
                    variant={itemEntryType === 'manual' ? 'primary' : 'secondary'}
                    size="small"
                    onClick={() => {
                      setItemEntryType('manual')
                      setSelectedVariantForAdd(null)
                    }}
                  >
                    Manual Entry
                  </Button>
                </div>
                <Text size="small" className="text-ui-fg-subtle">
                  {itemEntryType === 'catalog'
                    ? 'Select an existing product from your catalog'
                    : 'Create a new item using supplier part number as identifier'}
                </Text>
              </div>

              {/* Catalog Entry - Product Search */}
              {itemEntryType === 'catalog' && (
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
              )}

              {/* Manual Entry Fields */}
              {itemEntryType === 'manual' && (
                <div className="space-y-4 p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-y-2">
                      <Label htmlFor="product_name">Product/Variant Name *</Label>
                      <Controller
                        name="product_name"
                        control={addItemForm.control}
                        render={({ field, fieldState }) => (
                          <div className="flex flex-col gap-y-1">
                            <Input
                              {...field}
                              id="product_name"
                              placeholder="Enter product name"
                            />
                            {fieldState.error && (
                              <Text size="xsmall" className="text-ui-fg-error">
                                {fieldState.error.message}
                              </Text>
                            )}
                          </div>
                        )}
                      />
                      <Text size="xsmall" className="text-ui-fg-subtle">
                        Name as it appears in supplier catalog
                      </Text>
                    </div>

                    <div className="flex flex-col gap-y-2">
                      <Label htmlFor="manual_variant_sku">Your Internal SKU</Label>
                      <Controller
                        name="variant_sku"
                        control={addItemForm.control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            id="manual_variant_sku"
                            placeholder="Your SKU (if exists)"
                          />
                        )}
                      />
                      <Text size="xsmall" className="text-ui-fg-subtle">
                        Optional: Your internal product SKU
                      </Text>
                    </div>
                  </div>

                  <div className="flex flex-col gap-y-2">
                    <Label htmlFor="manual_description">Description</Label>
                    <Controller
                      name="description"
                      control={addItemForm.control}
                      render={({ field }) => (
                        <Textarea
                          {...field}
                          id="manual_description"
                          rows={2}
                          placeholder="Product description from supplier..."
                        />
                      )}
                    />
                  </div>

                  <div className="flex flex-col gap-y-2">
                    <Label htmlFor="manual_category">Category</Label>
                    <Controller
                      name="category"
                      control={addItemForm.control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          id="manual_category"
                          placeholder="Supplier's category"
                        />
                      )}
                    />
                  </div>
                </div>
              )}


              {/* Pricing Section */}
              <div className="space-y-4 p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base">
                <Heading level="h3" className="text-sm font-medium">Pricing Information</Heading>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-y-2">
                    <Label htmlFor="add_supplier_sku">
                      Supplier SKU {itemEntryType === 'manual' && '*'}
                    </Label>
                    <Controller
                      name="supplier_sku"
                      control={addItemForm.control}
                      render={({ field, fieldState }) => (
                        <div className="flex flex-col gap-y-1">
                          <Input
                            {...field}
                            id="add_supplier_sku"
                            placeholder={itemEntryType === 'manual' ? 'Required: Supplier part number' : 'Enter supplier SKU (optional)'}
                          />
                          {fieldState.error && (
                            <Text size="xsmall" className="text-ui-fg-error">
                              {fieldState.error.message}
                            </Text>
                          )}
                        </div>
                      )}
                    />
                    {itemEntryType === 'manual' && (
                      <Text size="xsmall" className="text-ui-fg-subtle">
                        Used as unique identifier for this item
                      </Text>
                    )}
                  </div>

                  <div className="flex flex-col gap-y-2">
                    <Label htmlFor="add_gross_price">
                      Gross Price (RRP) {itemEntryType === 'manual' && '*'}
                    </Label>
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
                    <Label htmlFor="calculated_net_price">Net Price (Calculated)</Label>
                    <div className="relative">
                      <Input
                        id="calculated_net_price"
                        type="text"
                        value={calculatedNetPrice > 0 ? calculatedNetPrice.toFixed(2) : '0.00'}
                        readOnly
                        className="bg-ui-bg-disabled text-ui-fg-muted"
                      />
                    </div>
                    <Text size="xsmall" className="text-ui-fg-subtle">
                      Auto-calculated from gross price - discount
                    </Text>
                  </div>
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
                disabled={addItemMutation.isPending || (itemEntryType === 'catalog' && !selectedVariantForAdd)}
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