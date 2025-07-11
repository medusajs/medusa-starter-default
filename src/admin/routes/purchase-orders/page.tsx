import { defineRouteConfig } from "@medusajs/admin-sdk"
import { 
  Container, 
  Heading, 
  Badge,
  DataTable,
  useDataTable,
  createDataTableColumnHelper,
  createDataTableFilterHelper,
  Text,
  Button,
  DataTablePaginationState,
  DataTableFilteringState,
  Filter
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
import { Link, useNavigate } from "react-router-dom"
import { CreatePurchaseOrderModal } from "../../components/create-purchase-order-modal"
import { useMemo, useState } from "react"

interface PurchaseOrder {
  id: string
  po_number: string
  supplier?: { name: string }
  status: string
  priority: string
  order_date: Date
  items_count?: number
  total_amount: number
  currency_code: string
}

const PAGE_SIZE = 20

const usePurchaseOrders = (
  pageIndex: number,
  pageSize: number,
  query?: string,
  filters?: DataTableFilteringState
) => {
  const params = new URLSearchParams()
  params.set("offset", (pageIndex * pageSize).toString())
  params.set("limit", pageSize.toString())
  if (query) {
    params.set("q", query)
  }
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if ((value as Filter).open) {
        params.set(key, (value as Filter).value.join(","))
      }
    }
  }

  return useQuery({
    queryKey: ["purchase-orders", params.toString()],
    queryFn: async () => {
      const response = await fetch(`/admin/purchase-orders?${params.toString()}&expand=supplier,items`)
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
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount / 100)
}

const filterHelper = createDataTableFilterHelper<PurchaseOrder>()
const usePurchaseOrderFilters = () => [
  filterHelper.accessor("status", { label: "Status", type: "select", options: [
    { label: "Draft", value: "draft" }, { label: "Sent", value: "sent" },
    { label: "Confirmed", value: "confirmed" }, { label: "Received", value: "received" },
    { label: "Cancelled", value: "cancelled" },
  ]}),
  filterHelper.accessor("priority", { label: "Priority", type: "select", options: [
    { label: "Urgent", value: "urgent" }, { label: "High", value: "high" },
    { label: "Normal", value: "normal" }, { label: "Low", value: "low" },
  ]}),
]

const PurchaseOrdersPage = () => {
  const navigate = useNavigate()

  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  })
  const [search, setSearch] = useState("")
  const [filtering, setFiltering] = useState<DataTableFilteringState>({})

  const { data, isLoading, error } = usePurchaseOrders(pagination.pageIndex, pagination.pageSize, search, filtering)
  
  const filters = usePurchaseOrderFilters()
  const purchaseOrders = data?.purchase_orders || []
  const count = data?.count || 0

  const columnHelper = createDataTableColumnHelper<PurchaseOrder>()
  const columns = [
    columnHelper.accessor("po_number", { header: "PO Number",
      cell: ({ getValue, row }) => (
        <div className="flex items-center gap-2">
          {getStatusIcon(row.original.status)}
          <Link to={`/a/purchase-orders/${row.original.id}`} className="font-medium text-blue-600 hover:underline">
            {getValue()}
          </Link>
        </div>
      ),
    }),
    columnHelper.accessor("supplier.name", { header: "Supplier", cell: ({ getValue }) => <Text>{getValue() || "N/A"}</Text> }),
    columnHelper.accessor("status", { header: "Status",
      cell: ({ getValue }) => <Badge color={getStatusColor(getValue()) as any}>{getValue()?.replace('_', ' ').toUpperCase()}</Badge>
    }),
    columnHelper.accessor("priority", { header: "Priority",
      cell: ({ getValue }) => <Badge color={getPriorityColor(getValue()) as any}>{getValue()?.toUpperCase()}</Badge>
    }),
    columnHelper.accessor("order_date", { header: "Order Date", cell: ({ getValue }) => <Text>{new Date(getValue()).toLocaleDateString()}</Text> }),
    columnHelper.accessor("items_count", { header: "Items", cell: ({ getValue }) => <Text>{getValue() || 0}</Text> }),
    columnHelper.accessor("total_amount", { header: "Total", cell: ({ getValue, row }) => <Text>{formatCurrency(getValue(), row.original.currency_code)}</Text> }),
    columnHelper.display({ id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="transparent" size="small" onClick={() => navigate(`/a/purchase-orders/${row.original.id}`)}><Eye /></Button>
          {row.original.status === 'draft' && <Button variant="transparent" size="small" onClick={() => navigate(`/a/purchase-orders/${row.original.id}/edit`)}><PencilSquare /></Button>}
        </div>
      ),
    }),
  ]

  const table = useDataTable({
    data: purchaseOrders,
    columns: columns,
    rowCount: count,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
    search: {
      state: search,
      onSearchChange: setSearch,
    },
    filtering: {
      state: filtering,
      onFilteringChange: setFiltering,
    },
    filters: filters,
    isLoading: isLoading,
  })

  if (error) throw error

  return (
    <Container className="p-0">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <Heading>Purchase Orders</Heading>
        <CreatePurchaseOrderModal />
      </div>
      <DataTable instance={table}>
        <DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
          <DataTable.Search placeholder="Search POs" />
          <DataTable.FilterMenu tooltip="Filter" />
        </DataTable.Toolbar>
        <DataTable.Table>
          <DataTable.Header />
          <DataTable.Body />
        </DataTable.Table>
        <DataTable.Pagination />
      </DataTable>
    </Container>
  )
}

export const config = defineRouteConfig({ label: "Purchase Orders", icon: DocumentText })
export default PurchaseOrdersPage
