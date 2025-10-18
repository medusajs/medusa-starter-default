import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Container,
  Heading,
  Button,
  Text,
  Badge,
  DataTable,
  useDataTable,
  createDataTableColumnHelper,
  createDataTableFilterHelper,
} from "@medusajs/ui"
import { Eye } from "@medusajs/icons"
import { Link } from "react-router-dom"
import { CreateMachineForm } from "../components/machines/create-machine-form"

interface Customer {
  id: string
  email?: string
  first_name?: string
  last_name?: string
}

interface WidgetProps {
  data: Customer
}

interface Machine {
  id: string
  brand_name: string
  model_number: string
  serial_number: string
  status: string
  engine_hours?: number
  location?: string
}

const PAGE_SIZE = 10

// Create filter helper
const filterHelper = createDataTableFilterHelper<Machine>()

const filters = [
  filterHelper.accessor("status", {
    type: "select",
    label: "Status",
    options: [
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
      { label: "Maintenance", value: "maintenance" },
      { label: "Sold", value: "sold" },
    ],
  }),
]

const CustomerMachinesWidget = ({ data: customer }: WidgetProps) => {
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

  // Fetch machines with pagination and filters
  const { data, isLoading } = useQuery({
    queryKey: ['customer-machines', customer.id, offset, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        customer_id: customer.id,
        limit: PAGE_SIZE.toString(),
        offset: offset.toString(),
      })

      if (statusFilter) params.append('status', statusFilter)

      const response = await fetch(`/admin/machines?${params}`)
      if (!response.ok) throw new Error('Failed to fetch machines')
      return response.json()
    },
  })

  const machines = data?.machines || []
  const count = data?.count || 0

  const columnHelper = createDataTableColumnHelper<Machine>()

  const columns = [
    columnHelper.accessor("brand_name", {
      header: "Machine",
      cell: ({ getValue, row }) => (
        <div className="flex flex-col gap-y-1">
          <Text weight="plus" size="small">{getValue() || 'Unknown Brand'}</Text>
          <Text size="xsmall" className="text-ui-fg-subtle">
            {row.original.model_number} • {row.original.serial_number}
          </Text>
        </div>
      ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ getValue }) => {
        const status = getValue()
        const statusConfig: Record<string, { color: string; label: string }> = {
          active: { color: "green", label: "Active" },
          inactive: { color: "red", label: "Inactive" },
          maintenance: { color: "orange", label: "Maintenance" },
          sold: { color: "grey", label: "Sold" },
        }
        const config = statusConfig[status] || { color: "grey", label: status }
        return <Badge size="2xsmall">{config.label}</Badge>
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button size="small" variant="transparent" asChild>
          <Link to={`/machines/${row.original.id}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
      ),
    }),
  ]

  const table = useDataTable({
    data: machines,
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
          <Heading level="h2">Machines</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {count} machine{count !== 1 ? 's' : ''} linked to this customer
          </Text>
        </div>
        <CreateMachineForm onSuccess={() => {
          // Query will be invalidated automatically by the form
        }} />
      </div>

      <div className="flex flex-col">
        <DataTable instance={table}>
          <DataTable.Toolbar>
            <DataTable.FilterMenu tooltip="Filter machines" />
          </DataTable.Toolbar>
          <DataTable.Table />
          <DataTable.Pagination />
        </DataTable>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "customer.details.side.after",
})

export default CustomerMachinesWidget
