import React from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Plus, PencilSquare, Trash, Calendar, EllipsisHorizontal } from "@medusajs/icons"
import { 
  Container, 
  Heading, 
  Button, 
  Badge, 
  Text,
  DataTable,
  useDataTable,
  createDataTableColumnHelper,
  createDataTableFilterHelper,
  toast,
  DropdownMenu,
  IconButton,
  StatusBadge
} from "@medusajs/ui"
import type { DataTableFilteringState } from "@medusajs/ui"
import { useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface Rental {
  id: string
  rental_order_number: string
  customer_id: string
  machine_id: string
  machine_model?: string | null
  machine_serial?: string | null
  machine_type?: string | null
  rental_type: "short_term" | "long_term" | "trial"
  status: "draft" | "confirmed" | "active" | "returned" | "overdue" | "cancelled"
  start_date: string
  end_date: string
  actual_return_date?: string | null
  daily_rate: number
  total_rental_cost: number
  delivery_required: boolean
  pickup_required: boolean
  notes?: string | null
  created_at: string
  updated_at: string
}

const PAGE_SIZE = 20

const filterHelper = createDataTableFilterHelper<Rental>()

const useRentalFilters = () => {
  return [
    filterHelper.accessor("status", {
      label: "Status",
      type: "select",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Confirmed", value: "confirmed" },
        { label: "Active", value: "active" },
        { label: "Returned", value: "returned" },
        { label: "Overdue", value: "overdue" },
        { label: "Cancelled", value: "cancelled" },
      ],
    }),
    filterHelper.accessor("rental_type", {
      label: "Rental Type",
      type: "select",
      options: [
        { label: "Short Term", value: "short_term" },
        { label: "Long Term", value: "long_term" },
        { label: "Trial", value: "trial" },
      ],
    }),
    filterHelper.accessor("start_date", {
      label: "Start Date",
      type: "date",
      format: "date",
      options: [],
    }),
    filterHelper.accessor("end_date", {
      label: "End Date", 
      type: "date",
      format: "date",
      options: [],
    }),
  ]
}

const useRentals = () => {
  return useQuery({
    queryKey: ["rentals"],
    queryFn: async () => {
      const response = await fetch(`/admin/rentals`)
      if (!response.ok) {
        throw new Error("Failed to fetch rentals")
      }
      const data = await response.json()
      return {
        rentals: data.rentals || [],
        count: data.count || 0
      }
    },
  })
}

const useDeleteRental = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/admin/rentals/${id}`, {
        method: "DELETE",
      })
      
      if (!response.ok) {
        throw new Error("Failed to delete rental")
      }
      
      return response.json()
    },
    onSuccess: () => {
      toast.success("Rental deleted successfully")
      queryClient.invalidateQueries({ queryKey: ["rentals"] })
    },
    onError: () => {
      toast.error("Failed to delete rental")
    },
  })
}

const RentalActions = ({ rental }: { rental: Rental }) => {
  const navigate = useNavigate()
  const deleteRentalMutation = useDeleteRental()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (window.confirm(`Are you sure you want to delete rental "${rental.rental_order_number}"?`)) {
      deleteRentalMutation.mutate(rental.id)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <IconButton size="small" variant="transparent">
          <EllipsisHorizontal className="h-4 w-4" />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content side="bottom">
        <DropdownMenu.Item
          onClick={() => navigate(`/rentals/${rental.id}`)}
          className="[&>svg]:text-ui-fg-subtle flex items-center gap-2"
        >
          <PencilSquare className="h-4 w-4" />
          Edit
        </DropdownMenu.Item>
        <DropdownMenu.Item
          onClick={handleDelete}
          disabled={deleteRentalMutation.isPending}
          className="[&>svg]:text-ui-fg-subtle flex items-center gap-2 text-ui-fg-error"
        >
          <Trash className="h-4 w-4" />
          Delete
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}

const RentalsListTable = () => {
  const navigate = useNavigate()
  const { data, isLoading, error } = useRentals()
  const filters = useRentalFilters()

  const [search, setSearch] = React.useState("")
  const [filtering, setFiltering] = React.useState<DataTableFilteringState>({})
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  })

  const rentals = data?.rentals || []
  const count = data?.count || 0

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: "grey" as const, label: "Draft" },
      confirmed: { color: "blue" as const, label: "Confirmed" },
      active: { color: "green" as const, label: "Active" },
      returned: { color: "purple" as const, label: "Returned" },
      overdue: { color: "red" as const, label: "Overdue" },
      cancelled: { color: "red" as const, label: "Cancelled" },
    } as const

    const config = statusConfig[status as keyof typeof statusConfig] || { color: "grey" as const, label: status }
    
    return (
      <StatusBadge color={config.color}>
        {config.label}
      </StatusBadge>
    )
  }

  const getRentalTypeBadge = (type: string) => {
    const typeConfig = {
      short_term: { color: "blue" as const, label: "Short Term" },
      long_term: { color: "green" as const, label: "Long Term" },
      trial: { color: "orange" as const, label: "Trial" },
    } as const

    const config = typeConfig[type as keyof typeof typeConfig] || { color: "grey" as const, label: type }
    
    return (
      <Badge variant="outline">
        {config.label}
      </Badge>
    )
  }

  const columnHelper = createDataTableColumnHelper<Rental>()

  const columns = [
    columnHelper.accessor("rental_order_number", {
      header: "Order #",
      enableSorting: true,
      cell: ({ getValue }) => (
        <Text className="font-medium">{getValue()}</Text>
      ),
    }),
    columnHelper.accessor("machine_model", {
      header: "Machine",
      cell: ({ row }) => (
        <div>
          <Text className="font-medium">{row.original.machine_model || "Unknown"}</Text>
          <Text className="text-ui-fg-subtle text-xs">{row.original.machine_serial}</Text>
        </div>
      ),
    }),
    columnHelper.accessor("rental_type", {
      header: "Type",
      cell: ({ getValue }) => getRentalTypeBadge(getValue()),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ getValue }) => getStatusBadge(getValue()),
    }),
    columnHelper.accessor("start_date", {
      header: "Start Date",
      enableSorting: true,
      cell: ({ getValue }) => (
        <Text>{new Date(getValue()).toLocaleDateString()}</Text>
      ),
    }),
    columnHelper.accessor("end_date", {
      header: "End Date",
      enableSorting: true,
      cell: ({ getValue }) => (
        <Text>{new Date(getValue()).toLocaleDateString()}</Text>
      ),
    }),
    columnHelper.accessor("daily_rate", {
      header: "Daily Rate",
      cell: ({ getValue }) => (
        <Text>${getValue().toFixed(2)}</Text>
      ),
    }),
    columnHelper.accessor("total_rental_cost", {
      header: "Total Cost",
      cell: ({ getValue }) => (
        <Text className="font-medium">${getValue().toFixed(2)}</Text>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => <RentalActions rental={row.original} />,
    }),
  ]

  const table = useDataTable({
    data: rentals,
    columns,
    filters,
    rowCount: count,
    getRowId: (row) => row.id,
    onRowClick: (event, row) => {
      navigate(`/rentals/${row.id}`)
    },
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

  if (error) {
    throw error
  }

  if (isLoading) {
    return (
      <Container className="p-6">
        <div className="flex items-center justify-center h-32">
          <Text className="text-ui-fg-subtle">Loading rentals...</Text>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>Rentals</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Manage your machine rentals ({count} rentals)
          </Text>
        </div>
        <Button size="small">
          <Plus className="h-4 w-4" />
          Create Rental
        </Button>
      </div>
      <DataTable instance={table}>
        <DataTable.Toolbar className="flex items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-2">
            <DataTable.FilterMenu />
          </div>
          <div className="flex items-center gap-2">
            <DataTable.Search placeholder="Search rentals..." />
          </div>
        </DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>
    </Container>
  )
}

const RentalsPageWithConfig = () => {
  return <RentalsListTable />
}

export const config = defineRouteConfig({
  label: "Rentals",
  icon: Calendar,
})

export default RentalsPageWithConfig