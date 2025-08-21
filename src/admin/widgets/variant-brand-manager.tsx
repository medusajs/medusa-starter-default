import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Button,
  Text,
  toast,
  DataTable,
  useDataTable,
  createDataTableColumnHelper,
  Badge,
  FocusModal,
  Label,
  Drawer,
} from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { PencilSquare, Plus } from "@medusajs/icons"
import VariantBrandField from "../components/common/variant-brand-field"

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

const VariantBrandManager = ({ data }: WidgetProps) => {
  const queryClient = useQueryClient()
  const [showBrandModal, setShowBrandModal] = useState(false)
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null)
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [search, setSearch] = useState<string>("")

  // Query to get variants with brand information
  const { data: enrichedVariants, isLoading, error } = useQuery({
    queryKey: ["product-variants-with-brands", data.id],
    queryFn: async () => {
      console.log("Fetching variants for product:", data.id)
      
      try {
        // First try our custom endpoint
        const response = await fetch(`/admin/products/${data.id}/variants?expand=brand`)
        console.log("Custom endpoint response status:", response.status)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error("Custom endpoint failed:", errorText)
          throw new Error(`API returned ${response.status}: ${errorText}`)
        }
        
        const result = await response.json()
        console.log("Custom endpoint result:", result)
        
        if (result.variants && Array.isArray(result.variants)) {
          setDebugInfo({ source: 'custom_endpoint', count: result.variants.length })
          return result.variants as ProductVariant[]
        } else {
          throw new Error("Invalid response format from custom endpoint")
        }
      } catch (customError) {
        console.warn("Custom endpoint failed, trying fallback:", customError)
        
        // Fallback: try to use data.variants if available
        if (data.variants && Array.isArray(data.variants) && data.variants.length > 0) {
          console.log("Using fallback data.variants:", data.variants)
          setDebugInfo({ source: 'fallback_data', count: data.variants.length })
          return data.variants as ProductVariant[]
        }
        
        // Last resort: try standard MedusaJS product API
        try {
          const fallbackResponse = await fetch(`/admin/products/${data.id}`)
          if (fallbackResponse.ok) {
            const fallbackResult = await fallbackResponse.json()
            if (fallbackResult.product?.variants) {
              console.log("Using standard API variants:", fallbackResult.product.variants)
              setDebugInfo({ source: 'standard_api', count: fallbackResult.product.variants.length })
              return fallbackResult.product.variants as ProductVariant[]
            }
          }
        } catch (fallbackError) {
          console.error("All fallback attempts failed:", fallbackError)
        }
        
        throw customError
      }
    },
    enabled: !!data?.id,
    retry: 1,
  })

  const updateVariantBrandMutation = useMutation({
    mutationFn: async ({ variantId, brandId }: { variantId: string; brandId: string | null }) => {
      const response = await fetch(`/admin/products/variants/${variantId}/brand`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_id: brandId }),
      })
      if (!response.ok) {
        throw new Error("Failed to update variant brand")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-variants-with-brands", data.id] })
      toast.success("Variant brand updated successfully")
      setShowBrandModal(false)
      setEditingVariant(null)
      setSelectedBrandId(null)
    },
    onError: (error) => {
      toast.error(`Failed to update variant brand: ${error.message}`)
    },
  })

  const handleEditBrand = (variant: ProductVariant) => {
    setEditingVariant(variant)
    setSelectedBrandId(variant.brand?.id || null)
    setShowBrandModal(true)
  }

  const handleUpdateBrand = () => {
    if (!editingVariant) return
    updateVariantBrandMutation.mutate({
      variantId: editingVariant.id,
      brandId: selectedBrandId,
    })
  }

  const columnHelper = createDataTableColumnHelper<ProductVariant>()

  const columns = [
    columnHelper.accessor("title", {
      header: "Variant",
      cell: ({ getValue, row }) => (
        <div className="flex flex-col gap-1">
          <Text className="font-medium">{getValue()}</Text>
          {row.original.sku && (
            <Text size="small" className="text-ui-fg-subtle font-mono">
              SKU: {row.original.sku}
            </Text>
          )}
        </div>
      ),
    }),
    columnHelper.display({
      id: "brand",
      header: "Brand",
      cell: ({ row }) => {
        const brand = row.original.brand
        return brand ? (
          <Badge color="blue" size="small">
            {brand.name} ({brand.code})
          </Badge>
        ) : (
          <Text className="text-ui-fg-muted">No brand assigned</Text>
        )
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          size="small"
          variant="secondary"
          onClick={() => handleEditBrand(row.original)}
        >
          <PencilSquare className="w-4 h-4" />
          Edit Brand
        </Button>
      ),
    }),
  ]

  const variants = enrichedVariants || data.variants || []
  
  const table = useDataTable({
    data: variants,
    columns,
    getRowId: (row) => row.id,
    isLoading,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
    search: {
      state: search,
      onSearchChange: setSearch,
    },
  })

  if (!data?.id) return null

  // Show error state
  if (error) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Heading level="h2">Variant Brands</Heading>
              <Text className="text-ui-fg-subtle">
                Manage brand assignments for product variants
              </Text>
            </div>
          </div>
        </div>
        <div className="px-6 py-8 text-center">
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <Text className="text-red-800">Failed to load variants</Text>
            <Text size="small" className="text-red-600 mt-1">
              {error.message}
            </Text>
          </div>
        </div>
      </Container>
    )
  }

  // Show empty state
  if (!isLoading && variants.length === 0) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Heading level="h2">Variant Brands</Heading>
              <Text className="text-ui-fg-subtle">
                Manage brand assignments for product variants
              </Text>
            </div>
          </div>
        </div>
        <div className="px-6 py-8 text-center">
          <Text className="text-ui-fg-muted">No variants found for this product</Text>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            This product may not have any variants created yet.
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
            <Heading level="h2">Variant Brands</Heading>
            <DataTable.Search placeholder="Search variants..." />
          </div>
        </DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>

      {/* Edit Brand Modal */}
      <FocusModal open={showBrandModal} onOpenChange={setShowBrandModal}>
        <FocusModal.Content>
          <FocusModal.Header>
            <FocusModal.Title>Edit Variant Brand</FocusModal.Title>
            <FocusModal.Description>
              {editingVariant && `Update brand for variant: ${editingVariant.title}`}
            </FocusModal.Description>
          </FocusModal.Header>
          <FocusModal.Body className="p-6">
            <div className="space-y-4">
              <div>
                <Label>Current Variant</Label>
                <div className="p-3 bg-ui-bg-subtle rounded border">
                  <Text className="font-medium">{editingVariant?.title}</Text>
                  {editingVariant?.sku && (
                    <Text size="small" className="text-ui-fg-subtle">
                      SKU: {editingVariant.sku}
                    </Text>
                  )}
                </div>
              </div>
              <VariantBrandField
                value={selectedBrandId}
                onChange={setSelectedBrandId}
                disabled={updateVariantBrandMutation.isPending}
              />
            </div>
          </FocusModal.Body>
          <FocusModal.Footer>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowBrandModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateBrand}
                disabled={updateVariantBrandMutation.isPending}
                isLoading={updateVariantBrandMutation.isPending}
              >
                Update Brand
              </Button>
            </div>
          </FocusModal.Footer>
        </FocusModal.Content>
      </FocusModal>
    </Container>
  )
}

export default VariantBrandManager

export const config = defineWidgetConfig({
  zone: "product.details.after",
})