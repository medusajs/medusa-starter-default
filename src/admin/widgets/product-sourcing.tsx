import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Badge,
  Button,
  Input,
  Text,
  toast,
  DataTable,
  useDataTable,
  createDataTableColumnHelper,
  Select,
} from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

// Define the product interface based on what's passed to widgets
interface Product {
  id: string
  title: string
  // Add other product fields as needed
}

interface WidgetProps {
  data: Product
}

type VariantWithSourcing = {
  id: string
  title: string
  sku: string | null
  sourcing: {
    id: string
    supplier: {
      id: string
      name: string
    }
    price: number
    gross_price?: number
    discount_amount?: number
    discount_percentage?: number
    net_price: number
    supplier_sku?: string | null // Only from supplier_product, not price_list
    price_list_name?: string | null
    source_type?: 'supplier_product' | 'price_list'
  }[]
}

type FlatSourcingRow = {
  id: string // unique row id
  variant_id: string
  variant_title: string
  variant_sku: string | null
  supplier_id: string
  supplier_name: string
  supplier_sku?: string | null // Only from supplier_product, not price_list
  price: number
  gross_price?: number
  discount_amount?: number
  discount_percentage?: number
  net_price: number
  source_type: 'supplier_product' | 'price_list'
  sourcing_id: string
}

const ProductSourcingWidget = ({ data: product }: WidgetProps) => {
  const queryClient = useQueryClient()
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({})
  const [types, setTypes] = useState<{ [key: string]: "stock" | "rush" }>({})
  const [searchValue, setSearchValue] = useState("")
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const { data, isLoading, error } = useQuery<{
    variants: VariantWithSourcing[]
  }>({
    queryKey: ["product_sourcing", product?.id],
    queryFn: async () => {
      const response = await fetch(
        `/admin/products/${product.id}/suppliers`
      )
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sourcing data: ${response.statusText}`)
      }
      
      return response.json()
    },
    enabled: !!product?.id,
  })

  // Transform nested data to flat structure for DataTable
  const flattenedSourcingData: FlatSourcingRow[] = data?.variants?.flatMap(variant => 
    variant.sourcing.map(sourcing => ({
      id: `${variant.id}-${sourcing.supplier.id}`,
      variant_id: variant.id,
      variant_title: variant.title,
      variant_sku: variant.sku,
      supplier_id: sourcing.supplier.id,
      supplier_name: sourcing.supplier.name,
      supplier_sku: sourcing.supplier_sku,
      price: sourcing.price,
      gross_price: sourcing.gross_price,
      discount_amount: sourcing.discount_amount,
      discount_percentage: sourcing.discount_percentage,
      net_price: sourcing.net_price,
      source_type: sourcing.source_type || 'supplier_product',
      sourcing_id: sourcing.id
    }))
  ) || []

  const addItemMutation = useMutation({
    mutationFn: async (data: {
      supplier_id: string
      type?: "stock" | "rush"
      item: {
        product_variant_id: string
        quantity: number
        unit_price: number
      }
    }) => {
      const response = await fetch(`/admin/purchase-orders/draft/add-item`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Request failed: ${response.statusText}`)
      }
      
      return response.json()
    },
    onSuccess: () => {
      toast.success("Item added to purchase list.")
      queryClient.invalidateQueries({ queryKey: ["draft_purchase_orders"] })
    },
    onError: (error) => {
      toast.error(`Failed to add item: ${error.message}`)
    }
  })

  const handleAddToPurchaseList = (row: FlatSourcingRow) => {
    const quantity = quantities[row.id]

    if (!quantity || quantity <= 0) {
      toast.warning("Please enter a quantity greater than 0.")
      return
    }

    addItemMutation.mutate({
      supplier_id: row.supplier_id,
      type: types[row.id] || "stock",
      item: {
        product_variant_id: row.variant_id,
        quantity: quantity,
        unit_price: row.net_price,
      },
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price / 100)
  }

  // DataTable setup
  const columnHelper = createDataTableColumnHelper<FlatSourcingRow>()
  
  const columns = [
    columnHelper.accessor("variant_title", {
      header: "Variant",
      enableSorting: true,
      cell: ({ getValue, row }) => (
        <div className="flex flex-col gap-y-1">
          <Text weight="plus">{getValue()}</Text>
          {row.original.variant_sku && (
            <Text size="small" className="text-ui-fg-muted">
              SKU: {row.original.variant_sku}
            </Text>
          )}
        </div>
      ),
    }),
    columnHelper.accessor("supplier_name", {
      header: "Supplier",
      enableSorting: true,
      cell: ({ getValue }) => (
        <Text weight="plus">{getValue()}</Text>
      ),
    }),
    columnHelper.accessor("gross_price", {
      header: "Gross Price",
      enableSorting: true,
      cell: ({ getValue }) => (
        <Text>{getValue() ? formatPrice(getValue()) : "—"}</Text>
      ),
    }),
    columnHelper.display({
      id: "discount",
      header: "Discount",
      cell: ({ row }) => {
        const { discount_amount, discount_percentage } = row.original
        if (discount_amount) {
          return <Text>{formatPrice(discount_amount)}</Text>
        }
        if (discount_percentage) {
          return <Text>{discount_percentage}%</Text>
        }
        return <Text>—</Text>
      },
    }),
    columnHelper.accessor("net_price", {
      header: "Net Price",
      enableSorting: true,
      cell: ({ getValue }) => (
        <Text weight="plus">{formatPrice(getValue())}</Text>
      ),
    }),
    columnHelper.display({
      id: "quantity",
      header: "Quantity",
      cell: ({ row }) => (
        <Input
          type="number"
          min="1"
          step="1"
          placeholder="0"
          className="w-20"
          value={quantities[row.original.id] || ""}
          onChange={(e) => {
            const value = parseInt(e.target.value) || 0
            setQuantities({
              ...quantities,
              [row.original.id]: value,
            })
          }}
        />
      ),
    }),
    columnHelper.display({
      id: "type",
      header: "Type",
      cell: ({ row }) => (
        <Select
          value={types[row.original.id] || "stock"}
          onValueChange={(value) => {
            setTypes({
              ...types,
              [row.original.id]: value as "stock" | "rush",
            })
          }}
        >
          <Select.Trigger className="w-24">
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="stock">Stock</Select.Item>
            <Select.Item value="rush">Rush</Select.Item>
          </Select.Content>
        </Select>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Action",
      cell: ({ row }) => (
        <Button
          size="small"
          onClick={() => handleAddToPurchaseList(row.original)}
          disabled={addItemMutation.isPending || !quantities[row.original.id] || quantities[row.original.id] <= 0}
        >
          {addItemMutation.isPending ? "Adding..." : "Add to List"}
        </Button>
      ),
    }),
  ]

  const table = useDataTable({
    data: flattenedSourcingData,
    columns,
    rowCount: flattenedSourcingData.length,
    getRowId: (row) => row.id,
    isLoading,
    search: {
      state: searchValue,
      onSearchChange: setSearchValue,
    },
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
  })

  if (!product?.id) {
    return null
  }

  if (error) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Sourcing</Heading>
        </div>
        <div className="px-6 py-8 text-center">
          <Text className="text-ui-fg-error">Failed to load sourcing data</Text>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            {error.message}
          </Text>
        </div>
      </Container>
    )
  }

  if (flattenedSourcingData.length === 0 && !isLoading) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Sourcing</Heading>
        </div>
        <div className="px-6 py-8 text-center">
          <Text className="text-ui-fg-muted">No sourcing options available for this product</Text>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <DataTable instance={table}>
        <DataTable.Toolbar>
          <div className="flex items-center justify-between w-full">
            <Heading level="h2">Sourcing</Heading>
            <DataTable.Search placeholder="Search sourcing options..." />
          </div>
        </DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductSourcingWidget 