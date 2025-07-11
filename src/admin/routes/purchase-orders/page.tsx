import { useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { 
  Container, 
  Heading, 
  Button, 
  Badge,
  DataTable,
  useDataTable,
  createDataTableColumnHelper,
  createDataTableFilterHelper,
  Text
} from "@medusajs/ui"
import { 
  Eye, 
  PencilSquare, 
  DocumentText,
  Clock,
  CheckCircle,
  XCircle
} from "@medusajs/icons"
import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import type { DataTableFilteringState } from "@medusajs/ui"
import { CreatePurchaseOrderModal } from "../../components/create-purchase-order-modal"

interface PurchaseOrder {
  id: string
  po_number: string
  supplier_id: string
  supplier?: { name: string }
  status: string
  priority: string
  order_date: Date
  expected_delivery_date?: Date
  total_amount: number
  currency_code: string
  created_at: Date
  items_count?: number
}

const PAGE_SIZE = 20

const usePurchaseOrders = (searchParams: URLSearchParams) => {
  const params = Object.fromEntries(searchParams.entries())

  return useQuery({
    queryKey: ["purchase-orders", params],
    queryFn: async () => {
      const response = await fetch(`/admin/purchase-orders?${searchParams.toString()}&expand=supplier,items`)
      if (!response.ok) throw new Error("Failed to fetch purchase orders")
      return response.json()
    },
  })
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'draft': return <Clock className="w-4 h-4" />
    case 'sent': return <DocumentText className="w-4 h-4" />
    case 'confirmed': return <CheckCircle className="w-4 h-4" />
    case 'received': return <CheckCircle className="w-4 h-4" />
    case 'cancelled': return <XCircle className="w-4 h-4" />
    default: return <Clock className="w-4 h-4" />
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'draft': return 'grey'
    case 'sent': return 'blue'
    case 'confirmed': return 'orange'
    case 'partially_received': return 'purple'
    case 'received': return 'green'
    case 'cancelled': return 'red'
    default: return 'grey'
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'red'
    case 'high': return 'orange'
    case 'normal': return 'blue'
    case 'low': return 'grey'
    default: return 'blue'
  }
}

const formatCurrency = (amount: number, currency: string) => {
  if (amount === null || amount === undefined) return "N/A"
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(amount / 100) // Assuming amount is in cents
}

const filterHelper = createDataTableFilterHelper<PurchaseOrder>()

const usePurchaseOrderFilters = () => {
  return [
    filterHelper.accessor("status", {
      label: "Status",
      type: "select",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Sent", value: "sent" },
        { label: "Confirmed", value: "confirmed" },
        { label: "Partially Received", value: "partially_received" },
        { label: "Received", value: "received" },
        { label: "Cancelled", value: "cancelled" },
      ],
    }),
    filterHelper.accessor("priority", {
      label: "Priority",
      type: "select",
      options: [
        { label: "Urgent", value: "urgent" },
        { label: "High", value: "high" },
        { label: "Normal", value: "normal" },
        { label: "Low", value: "low" },
      ],
    }),
  ]
}

const PurchaseOrdersPage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data, isLoading, error } = usePurchaseOrders(searchParams)
  
  const filters = usePurchaseOrderFilters()
  const purchaseOrders = data?.purchase_orders || []
  const count = data?.count || 0

  const columnHelper = createDataTableColumnHelper<PurchaseOrder>()

  const columns = [
    columnHelper.accessor("po_number", {
      header: "PO Number",
      cell: ({ getValue, row }) => (
        <div className="flex items-center gap-2">
          {getStatusIcon(row.original.status)}
          <Link 
            to={`/a/purchase-orders/${row.original.id}`}
            className="font-medium text-blue-600 hover:underline"
          >
            {getValue()}
          </Link>
        </div>
      ),
    }),
    columnHelper.accessor("supplier.name", {
      header: "Supplier",
      cell: ({ getValue }) => <Text className="font-medium">{getValue() || "N/A"}</Text>,
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ getValue }) => (
        <Badge size="2xsmall" color={getStatusColor(getValue()) as any}>
          {getValue()?.replace('_', ' ')?.toUpperCase()}
        </Badge>
      ),
    }),
    columnHelper.accessor("priority", {
      header: "Priority",
      cell: ({ getValue }) => (
        <Badge size="2xsmall" color={getPriorityColor(getValue()) as any}>
          {getValue()?.toUpperCase()}
        </Badge>
      ),
    }),
    columnHelper.accessor("order_date", {
      header: "Order Date",
      cell: ({ getValue }) => <Text>{new Date(getValue()).toLocaleDateString()}</Text>,
    }),
    columnHelper.accessor("items_count", {
      header: "Items",
      cell: ({ getValue }) => <Text>{getValue() || 0} items</Text>,
    }),
    columnHelper.accessor("total_amount", {
      header: "Total",
      cell: ({ getValue, row }) => (
        <Text className="font-medium">
          {formatCurrency(getValue(), row.original.currency_code)}
        </Text>
      ),
    }),
    columnHelper.display({
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="transparent"
            size="small"
            onClick={() => navigate(`/a/purchase-orders/${row.original.id}`)}
          >
            <Eye className="w-4 h-4" />
          </Button>
          {row.original.status === 'draft' && (
            <Button
              variant="transparent"
              size="small"
              onClick={() => navigate(`/a/purchase-orders/${row.original.id}/edit`)}
            >
              <PencilSquare className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    }),
  ]

  const { search, ...searchProps } = useDataTable.search(searchParams)
  const { state, ...filteringProps } = useDataTable.filtering(searchParams, filters)
  const { ...paginationProps } = useDataTable.pagination(searchParams, count, PAGE_SIZE)
  
  const table = useDataTable({
    data: purchaseOrders,
    columns: columns,
    count: count,
    ...searchProps,
    ...filteringProps,
    ...paginationProps,
    isLoading: isLoading,
  })

  if (error) {
    throw error
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading>Purchase Orders</Heading>
        <CreatePurchaseOrderModal />
      </div>
      <DataTable table={table} filters={filters}>
        <DataTable.Toolbar>
          <DataTable.Search
            query={search}
            onQueryChange={(q) => setSearchParams((prev) => {
              prev.set("q", q)
              return prev
            })}
            placeholder="Search POs"
          />
          <DataTable.FilterMenu filters={filters} state={state} onStateChange={(s) => {
             const newParams = new URLSearchParams(searchParams)
             for (const [key, value] of Object.entries(s)) {
               if(value.open) newParams.set(key, value.value.join(","))
               else newParams.delete(key)
             }
             setSearchParams(newParams)
          }} />
        </DataTable.Toolbar>
        <DataTable.Content>
          <DataTable.Table>
            <DataTable.Header />
            <DataTable.Body />
          </DataTable.Table>
        </DataTable.Content>
        <DataTable.Pagination />
      </DataTable>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Purchase Orders",
  icon: DocumentText,
})

export default PurchaseOrdersPage 