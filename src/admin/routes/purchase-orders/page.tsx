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
  Plus, 
  Eye, 
  PencilSquare, 
  DocumentText,
  Clock,
  CheckCircle,
  XCircle
} from "@medusajs/icons"
import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "react-router-dom"
import type { DataTableFilteringState } from "@medusajs/ui"

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

const usePurchaseOrders = () => {
  return useQuery({
    queryKey: ["purchase-orders"],
    queryFn: async () => {
      const response = await fetch("/admin/purchase-orders?expand=supplier,items")
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
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(amount / 100)
}

const PurchaseOrdersPage = () => {
  const navigate = useNavigate()
  const { data, isLoading, error } = usePurchaseOrders()
  
  const [search, setSearch] = useState("")
  const [filtering, setFiltering] = useState<DataTableFilteringState>({})
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  })

  if (error) {
    throw error
  }

  const purchaseOrders = data?.purchase_orders || []
  const count = data?.count || 0

  const columnHelper = createDataTableColumnHelper<PurchaseOrder>()
  const filterHelper = createDataTableFilterHelper<PurchaseOrder>()

  const filters = [
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

  const columns = [
    columnHelper.accessor("po_number", {
      header: "PO Number",
      enableSorting: true,
      cell: ({ getValue, row }) => (
        <div className="flex items-center gap-2">
          {getStatusIcon(row.original.status)}
          <Link 
            to={`/admin/purchase-orders/${row.original.id}`}
            className="font-medium text-blue-600 hover:underline"
          >
            {getValue()}
          </Link>
        </div>
      ),
    }),
    columnHelper.accessor("supplier", {
      header: "Supplier",
      cell: ({ getValue }) => (
        <Text className="font-medium">
          {getValue()?.name || "Unknown Supplier"}
        </Text>
      ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ getValue }) => (
        <Badge size="2xsmall" color={getStatusColor(getValue())}>
          {getValue().replace('_', ' ').toUpperCase()}
        </Badge>
      ),
    }),
    columnHelper.accessor("priority", {
      header: "Priority",
      cell: ({ getValue }) => (
        <Badge size="2xsmall" color={getPriorityColor(getValue())}>
          {getValue().toUpperCase()}
        </Badge>
      ),
    }),
    columnHelper.accessor("order_date", {
      header: "Order Date",
      enableSorting: true,
      cell: ({ getValue }) => (
        <Text>{new Date(getValue()).toLocaleDateString()}</Text>
      ),
    }),
    columnHelper.accessor("expected_delivery_date", {
      header: "Expected Delivery",
      cell: ({ getValue }) => {
        const date = getValue()
        return (
          <Text>
            {date ? new Date(date).toLocaleDateString() : "—"}
          </Text>
        )
      },
    }),
    columnHelper.accessor("total_amount", {
      header: "Total",
      enableSorting: true,
      cell: ({ getValue, row }) => (
        <Text className="font-medium">
          {formatCurrency(getValue(), row.original.currency_code)}
        </Text>
      ),
    }),
    columnHelper.accessor("items_count", {
      header: "Items",
      cell: ({ getValue }) => (
        <Text>{getValue() || 0} items</Text>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="transparent"
            size="small"
            onClick={() => navigate(`/admin/purchase-orders/${row.original.id}`)}
          >
            <Eye className="w-4 h-4" />
          </Button>
          {row.original.status === 'draft' && (
            <Button
              variant="transparent"
              size="small"
              onClick={() => navigate(`/admin/purchase-orders/${row.original.id}/edit`)}
            >
              <PencilSquare className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    }),
  ]

  const table = useDataTable({
    data: purchaseOrders,
    columns,
    filters,
    rowCount: count,
    getRowId: (row) => row.id,
    search: {
      state: search,
      onSearchChange: setSearch,
    },
    filtering: {
      state: filtering,
      onFilteringChange: setFiltering,
    },
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
  })

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>Purchase Orders</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Manage your purchase orders and procurement process ({count} orders)
          </Text>
        </div>
        <Button size="small" variant="secondary" asChild>
          <Link to="/admin/purchase-orders/create">
            <Plus className="w-4 h-4 mr-2" />
            Create Purchase Order
          </Link>
        </Button>
      </div>
      
      <DataTable instance={table}>
        <DataTable.Toolbar className="flex items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-2">
            <DataTable.FilterMenu tooltip="Filter orders" />
          </div>
          <div className="flex items-center gap-2">
            <DataTable.Search placeholder="Search purchase orders..." />
          </div>
        </DataTable.Toolbar>
        <DataTable.Table />
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