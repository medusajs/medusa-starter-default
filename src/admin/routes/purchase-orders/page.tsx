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
  DataTableFilteringState,
  StatusBadge
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
import { useCustomTranslation } from "../../hooks/use-custom-translation"

interface PurchaseOrder {
  id: string
  po_number: string
  supplier?: { name: string }
  status: string
  priority: string
  type: string
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

const getTypeColor = (type: string) => {
  switch (type) {
    case 'rush': return 'red'
    case 'stock': return 'blue'
    default: return 'blue'
  }
}

const formatCurrency = (amount: number, currency: string) => {
  if (amount === null || amount === undefined) return "N/A"
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount / 100)
}

const usePurchaseOrderFilters = () => {
  const { t } = useCustomTranslation()
  const filterHelper = createDataTableFilterHelper<PurchaseOrder>()

  return [
    filterHelper.accessor("status", { 
      label: t("custom.general.status"), 
      type: "select", 
      options: [
        { label: t("custom.purchaseOrders.status.draft"), value: "draft" }, 
        { label: t("custom.purchaseOrders.status.sent"), value: "sent" },
        { label: t("custom.purchaseOrders.status.confirmed"), value: "confirmed" }, 
        { label: t("custom.purchaseOrders.status.received"), value: "received" },
        { label: t("custom.purchaseOrders.status.cancelled"), value: "cancelled" },
      ]
    }),
    filterHelper.accessor("priority", { 
      label: t("custom.purchaseOrders.priority"), 
      type: "select", 
      options: [
        { label: t("custom.purchaseOrders.priorities.urgent"), value: "urgent" }, 
        { label: t("custom.purchaseOrders.priorities.high"), value: "high" },
        { label: t("custom.purchaseOrders.priorities.normal"), value: "normal" }, 
        { label: t("custom.purchaseOrders.priorities.low"), value: "low" },
      ]
    }),
    filterHelper.accessor("type", { 
      label: "Type", 
      type: "select", 
      options: [
        { label: "Stock", value: "stock" }, 
        { label: "Rush", value: "rush" },
      ]
    }),
  ]
}

const PurchaseOrdersPage = () => {
  const { t } = useCustomTranslation()
  const navigate = useNavigate()
  const { data, error } = usePurchaseOrders()
  const filters = usePurchaseOrderFilters()
  
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: "grey" as const, label: t("custom.purchaseOrders.status.draft") },
      sent: { color: "blue" as const, label: t("custom.purchaseOrders.status.sent") },
      confirmed: { color: "orange" as const, label: t("custom.purchaseOrders.status.confirmed") },
      received: { color: "green" as const, label: t("custom.purchaseOrders.status.received") },
      cancelled: { color: "red" as const, label: t("custom.purchaseOrders.status.cancelled") },
    } as const

    const config = statusConfig[status as keyof typeof statusConfig] || { color: "grey" as const, label: status }
    
    return (
      <StatusBadge color={config.color}>
        {config.label}
      </StatusBadge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      urgent: { color: "red" as const, label: t("custom.purchaseOrders.priorities.urgent") },
      high: { color: "orange" as const, label: t("custom.purchaseOrders.priorities.high") },
      normal: { color: "blue" as const, label: t("custom.purchaseOrders.priorities.normal") },
      low: { color: "grey" as const, label: t("custom.purchaseOrders.priorities.low") },
    } as const

    const config = priorityConfig[priority as keyof typeof priorityConfig] || { color: "grey" as const, label: priority }
    
    return (
      <StatusBadge color={config.color}>
        {config.label}
      </StatusBadge>
    )
  }

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      stock: { color: "blue" as const, label: "Stock" },
      rush: { color: "red" as const, label: "Rush" },
    } as const

    const config = typeConfig[type as keyof typeof typeConfig] || { color: "blue" as const, label: type }
    
    return (
      <StatusBadge color={config.color}>
        {config.label}
      </StatusBadge>
    )
  }

  const columnHelper = createDataTableColumnHelper<PurchaseOrder>()

  const columns = [
    columnHelper.accessor("po_number", { 
      header: t("custom.purchaseOrders.number"),
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
      header: t("custom.purchaseOrders.supplier"),
      cell: ({ getValue }) => (
        <Text>{getValue() || "No supplier"}</Text>
      ),
    }),
    columnHelper.accessor("status", { 
      header: t("custom.general.status"),
      cell: ({ getValue }) => getStatusBadge(getValue()),
    }),
    columnHelper.accessor("priority", { 
      header: t("custom.purchaseOrders.priority"),
      cell: ({ getValue }) => getPriorityBadge(getValue()),
    }),
    columnHelper.accessor("type", { 
      header: "Type",
      cell: ({ getValue }) => getTypeBadge(getValue()),
    }),
    columnHelper.accessor("total_amount", { 
      header: t("custom.purchaseOrders.amount"),
      cell: ({ getValue, row }) => (
        <Text className="font-mono">
          {formatCurrency(getValue(), row.original.currency_code)}
        </Text>
      ),
    }),
    columnHelper.accessor("order_date", { 
      header: t("custom.purchaseOrders.date"),
      cell: ({ getValue }) => (
        <Text>{new Date(getValue()).toLocaleDateString()}</Text>
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
          <Heading>{t("custom.purchaseOrders.title")}</Heading>
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

export const config = defineRouteConfig({ 
  label: "Purchase Orders", 
  icon: DocumentText 
})

export default PurchaseOrdersPage
