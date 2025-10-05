import { useMemo, useState } from "react"
import {
  DataTable,
  useDataTable,
  createDataTableColumnHelper,
  Text,
  Button,
  Badge,
  DataTablePaginationState,
  Heading,
} from "@medusajs/ui"
import { Thumbnail } from "../common/thumbnail"
import { useProducts } from "../../hooks/api/products"

const LIMIT = 15

/**
 * Product interface based on MedusaJS v2 Admin API
 */
export interface Product {
  id: string
  title: string
  description?: string
  thumbnail?: string
  status: string
  variants: ProductVariant[]
}

/**
 * Product Variant interface
 */
export interface ProductVariant {
  id: string
  title: string
  sku?: string
  prices?: Array<{
    amount: number
    currency_code: string
  }>
  calculated_price?: {
    calculated_amount: number
  }
}

/**
 * Props for ProductSelectionTable component
 * Used in invoice line item addition modal for product selection
 */
interface ProductSelectionTableProps {
  /**
   * Callback when a product is selected
   * Will trigger variant selection step if product has multiple variants
   */
  onSelectProduct: (product: Product) => void
}

export const ProductSelectionTable = ({
  onSelectProduct,
}: ProductSelectionTableProps) => {
  const [search, setSearch] = useState("")
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageIndex: 0,
    pageSize: LIMIT,
  })

  const offset = useMemo(() => {
    return pagination.pageIndex * LIMIT
  }, [pagination.pageIndex])

  // Use the existing useProducts hook from the codebase
  const { products, count, isLoading, isError } = useProducts({
    q: search,
    limit: LIMIT,
    offset,
  })

  const columnHelper = createDataTableColumnHelper<Product>()

  const columns = [
    columnHelper.display({
      id: "thumbnail",
      header: "",
      cell: ({ row }) => (
        <Thumbnail src={row.original.thumbnail} alt={row.original.title} />
      ),
    }),
    columnHelper.accessor("title", {
      header: "Product",
      cell: ({ getValue, row }) => (
        <div className="flex flex-col gap-y-1">
          <Text weight="plus">{getValue()}</Text>
          {row.original.description && (
            <Text size="small" className="text-ui-fg-muted line-clamp-1">
              {row.original.description}
            </Text>
          )}
        </div>
      ),
    }),
    columnHelper.accessor("variants", {
      id: "sku",
      header: "SKU",
      cell: ({ row }) => {
        const firstVariant = row.original.variants?.[0]
        return (
          <Text size="small" className="text-ui-fg-muted">
            {firstVariant?.sku || "-"}
          </Text>
        )
      },
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ getValue }) => {
        const status = getValue()
        const color =
          status === "published"
            ? "green"
            : status === "draft"
            ? "grey"
            : "red"
        return (
          <Badge size="2xsmall" color={color}>
            {status}
          </Badge>
        )
      },
    }),
    columnHelper.accessor("variants", {
      id: "variants_count",
      header: "Variants",
      cell: ({ row }) => (
        <Text size="small" className="text-ui-fg-muted">
          {row.original.variants?.length || 0}
        </Text>
      ),
    }),
    columnHelper.accessor("variants", {
      id: "price",
      header: "Price",
      cell: ({ row }) => {
        const firstVariant = row.original.variants?.[0]
        const price = firstVariant?.calculated_price?.calculated_amount
        const currencyPrice = firstVariant?.prices?.[0]

        // Prices are already in cents, format them properly
        if (price !== undefined) {
          const currencyCode = currencyPrice?.currency_code || "EUR"
          return (
            <Text size="small">
              {new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: currencyCode,
              }).format(price)}
            </Text>
          )
        }

        if (currencyPrice) {
          return (
            <Text size="small">
              {new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: currencyPrice.currency_code,
              }).format(currencyPrice.amount)}
            </Text>
          )
        }

        return <Text size="small" className="text-ui-fg-muted">-</Text>
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          size="small"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation()
            onSelectProduct(row.original)
          }}
        >
          Select
        </Button>
      ),
    }),
  ]

  const table = useDataTable({
    columns,
    data: products,
    getRowId: (row) => row.id,
    rowCount: count,
    isLoading,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
    search: {
      state: search,
      onSearchChange: setSearch,
    },
    onRowClick: (_, row) => {
      onSelectProduct(row.original)
    },
  })

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-4">
        <Text className="text-ui-fg-error" weight="plus">
          Failed to load products
        </Text>
        <Text size="small" className="text-ui-fg-muted">
          Please try again or contact support if the issue persists.
        </Text>
      </div>
    )
  }

  // Empty state when no products found
  const showEmptyState = !isLoading && products.length === 0

  return (
    <div className="flex flex-col gap-4">
      <DataTable instance={table}>
        <DataTable.Toolbar>
          <div className="flex items-center justify-between w-full">
            <Heading level="h3">Select Product</Heading>
            <DataTable.Search placeholder="Search products..." />
          </div>
        </DataTable.Toolbar>
        {showEmptyState ? (
          <div className="flex flex-col items-center justify-center p-16 gap-2">
            <Text className="text-ui-fg-muted" weight="plus">
              No products found
            </Text>
            <Text size="small" className="text-ui-fg-subtle">
              {search
                ? `No products match "${search}"`
                : "Create products to add them to invoices"}
            </Text>
          </div>
        ) : (
          <>
            <DataTable.Table />
            <DataTable.Pagination />
          </>
        )}
      </DataTable>
    </div>
  )
}
