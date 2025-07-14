import { useState } from "react"
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
  DataTableFilteringState
} from "@medusajs/ui"
import { 
  Eye, 
  PencilSquare, 
  DocumentText,
  Clock,
  CheckCircle,
  XCircle,
  Plus
} from "@medusajs/icons"
import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "react-router-dom"
import { CreatePurchaseOrderModal } from "../../components/create-purchase-order-modal"

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

const usePurchaseOrders = () => {
  return useQuery({
    queryKey: ["purchase-orders"],
    queryFn: async () => {
      const response = await fetch(`/admin/purchase-orders?expand=supplier,items`)
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
      { label: "Received", value: "received" },
      { label: "Cancelled", value: "cancelled" },
    ]
  }),
  filterHelper.accessor("priority", { 
    label: "Priority", 
    type: "select", 
    options: [
      { label: "Urgent", value: "urgent" }, 
      { label: "High", value: "high" },
      { label: "Normal", value: "normal" }, 
      { label: "Low", value: "low" },
    ]
  }),
]

const PurchaseOrdersPage = () => {
  const navigate = useNavigate()
  const { data, error } = usePurchaseOrders()
  
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
  const columns = [
    columnHelper.accessor("po_number", { 
      header: "PO Number",
      enableSorting: true,
      cell: ({ getValue, row }) => (
        <div className="flex items-center gap-2">
          {getStatusIcon(row.original.status)}
          <Link 
            to={`/purchase-orders/${row.original.id}`} 
            className="font-medium text-blue-600 hover:underline"
          >
            {getValue()}
          </Link>
        </div>
      ),
    }),
    columnHelper.accessor("supplier.name", { 
      header: "Supplier", 
      cell: ({ getValue }) => (
        <Text className="font-medium">{getValue() || "N/A"}</Text>
      )
    }),
    columnHelper.accessor("status", { 
      header: "Status",
      cell: ({ getValue }) => (
        <Badge size="2xsmall" color={getStatusColor(getValue()) as any}>
          {getValue()?.replace('_', ' ').toUpperCase()}
        </Badge>
      )
    }),
    columnHelper.accessor("priority", { 
      header: "Priority",
      cell: ({ getValue }) => (
        <Badge size="2xsmall" color={getPriorityColor(getValue()) as any}>
          {getValue()?.toUpperCase()}
        </Badge>
      )
    }),
    columnHelper.accessor("order_date", { 
      header: "Order Date", 
      cell: ({ getValue }) => (
        <Text>{new Date(getValue()).toLocaleDateString()}</Text>
      )
    }),
    columnHelper.accessor("items_count", { 
      header: "Items", 
      cell: ({ getValue }) => (
        <Text>{getValue() || 0}</Text>
      )
    }),
    columnHelper.accessor("total_amount", { 
      header: "Total", 
      cell: ({ getValue, row }) => (
        <Text className="font-medium">{formatCurrency(getValue(), row.original.currency_code)}</Text>
      )
    }),
    columnHelper.display({ 
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="transparent"
            size="small"
            onClick={() => navigate(`/purchase-orders/${row.original.id}`)}
          >
            <Eye className="w-4 h-4" />
          </Button>
          {row.original.status === 'draft' && (
            <Button
              variant="transparent"
              size="small"
              onClick={() => navigate(`/purchase-orders/${row.original.id}/edit`)}
              title="Edit Purchase Order"
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
            Manage purchase orders and track supplier deliveries ({count} orders)
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Button size="small" variant="secondary" asChild>
            <Link to="/suppliers">
              <Plus className="w-4 h-4 mr-2" />
              Manage Suppliers
            </Link>
          </Button>
          <CreatePurchaseOrderModal />
        </div>
      </div>
      
      <DataTable instance={table}>
        <DataTable.Toolbar className="flex items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-2">
            <DataTable.FilterMenu tooltip="Filter purchase orders" />
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

export const config = defineRouteConfig({ label: "Purchase Orders", icon: DocumentText })
export default PurchaseOrdersPage
