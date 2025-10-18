import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Container,
  Heading,
  Text,
  StatusBadge,
  Button,
  DataTable,
  useDataTable,
  createDataTableColumnHelper,
  createDataTableFilterHelper,
} from "@medusajs/ui"
import { Eye } from "@medusajs/icons"
import { Link } from "react-router-dom"

interface Customer {
  id: string
  email?: string
  first_name?: string
  last_name?: string
}

interface WidgetProps {
  data: Customer
}

interface ServiceOrder {
  id: string
  service_order_number: string
  service_type: string
  status: string
  priority: string
  description: string
  created_at: string
  scheduled_start_date?: string
  actual_start_date?: string
}

const PAGE_SIZE = 10

// Create filter helper
const filterHelper = createDataTableFilterHelper<ServiceOrder>()

const filters = [
  filterHelper.accessor("status", {
    type: "select",
    label: "Status",
    options: [
      { label: "⚪ Draft", value: "draft" },
      { label: "🔵 Ready for Pickup", value: "ready_for_pickup" },
      { label: "🟠 In Progress", value: "in_progress" },
      { label: "🟢 Done", value: "done" },
      { label: "🔴 Returned for Review", value: "returned_for_review" },
    ],
  }),
  filterHelper.accessor("priority", {
    type: "select",
    label: "Priority",
    options: [
      { label: "⚪ Low", value: "low" },
      { label: "🔵 Normal", value: "normal" },
      { label: "🟠 High", value: "high" },
      { label: "🔴 Urgent", value: "urgent" },
    ],
  }),
]

const CustomerServiceOrdersWidget = ({ data: customer }: WidgetProps) => {
  const [filtering, setFiltering] = useState({})
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  })

  const offset = useMemo(() => {
    return pagination.pageIndex * PAGE_SIZE
  }, [pagination.pageIndex])

  // Extract filter values from filtering state
  const statusFilter = useMemo(() => {
    const statusValues = (filtering as any)?.status
    return Array.isArray(statusValues) && statusValues.length > 0 ? statusValues[0] : null
  }, [filtering])

  const priorityFilter = useMemo(() => {
    const priorityValues = (filtering as any)?.priority
    return Array.isArray(priorityValues) && priorityValues.length > 0 ? priorityValues[0] : null
  }, [filtering])

  // Fetch service orders with pagination and filters
  const { data, isLoading } = useQuery({
    queryKey: ['customer-service-orders', customer.id, offset, statusFilter, priorityFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        customer_id: customer.id,
        limit: PAGE_SIZE.toString(),
        offset: offset.toString(),
      })

      if (statusFilter) params.append('status', statusFilter)
      if (priorityFilter) params.append('priority', priorityFilter)

      const response = await fetch(`/admin/service-orders?${params}`)
      if (!response.ok) throw new Error('Failed to fetch service orders')
      return response.json()
    },
  })

  const serviceOrders = data?.service_orders || []
  const count = data?.count || 0

  const columnHelper = createDataTableColumnHelper<ServiceOrder>()

  const columns = [
    columnHelper.accessor("service_order_number", {
      header: "Service Order",
      cell: ({ getValue, row }) => (
        <div className="flex flex-col gap-y-1">
          <Text weight="plus" size="small">{getValue()}</Text>
          <Text size="xsmall" className="text-ui-fg-subtle line-clamp-1">
            {row.original.description}
          </Text>
        </div>
      ),
    }),
    columnHelper.accessor("service_type", {
      header: "Type",
      cell: ({ getValue }) => {
        const typeLabels: Record<string, string> = {
          insurance: "Insurance",
          warranty: "Warranty",
          internal: "Internal",
          standard: "Standard",
          sales_prep: "Sales Prep",
          quote: "Quote",
        }
        return <Text size="small">{typeLabels[getValue()] || getValue()}</Text>
      },
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ getValue }) => {
        const status = getValue()
        const statusConfig: Record<string, { color: "grey" | "red" | "green" | "blue" | "orange" | "purple"; label: string }> = {
          draft: { color: "grey", label: "Draft" },
          ready_for_pickup: { color: "blue", label: "Ready for Pickup" },
          in_progress: { color: "orange", label: "In Progress" },
          done: { color: "green", label: "Done" },
          returned_for_review: { color: "red", label: "Returned for Review" },
        }
        const config = statusConfig[status] || { color: "grey" as const, label: status }
        return <StatusBadge color={config.color}>{config.label}</StatusBadge>
      },
    }),
    columnHelper.accessor("priority", {
      header: "Priority",
      cell: ({ getValue }) => {
        const priority = getValue()
        const priorityConfig: Record<string, { color: "grey" | "red" | "green" | "blue" | "orange" | "purple"; label: string }> = {
          low: { color: "grey", label: "Low" },
          normal: { color: "blue", label: "Normal" },
          high: { color: "orange", label: "High" },
          urgent: { color: "red", label: "Urgent" },
        }
        const config = priorityConfig[priority] || { color: "grey" as const, label: priority }
        return <StatusBadge color={config.color}>{config.label}</StatusBadge>
      },
    }),
    columnHelper.accessor("created_at", {
      header: "Date",
      cell: ({ row }) => {
        const dateString = row.original.actual_start_date || row.original.scheduled_start_date || row.original.created_at
        return (
          <Text size="small">
            {dateString ? new Date(dateString).toLocaleDateString() : "—"}
          </Text>
        )
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button size="small" variant="transparent" asChild>
          <Link to={`/service-orders/${row.original.id}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
      ),
    }),
  ]

  const table = useDataTable({
    data: serviceOrders,
    columns,
    rowCount: count,
    getRowId: (row) => row.id,
    isLoading,
    filters,
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
          <Heading level="h2">Service Orders</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {count} service order{count !== 1 ? 's' : ''} for this customer
          </Text>
        </div>
      </div>

      <div className="flex flex-col">
        <DataTable instance={table}>
          <DataTable.Toolbar>
            <DataTable.FilterMenu tooltip="Filter service orders" />
          </DataTable.Toolbar>
          <DataTable.Table />
          <DataTable.Pagination />
        </DataTable>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "customer.details.after",
})

export default CustomerServiceOrdersWidget
