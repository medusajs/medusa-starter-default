/**
 * TEM-207: Rentals Admin UI - DataTable List View
 *
 * This page displays all rentals in a DataTable with filtering, search, and pagination.
 * Follows MedusaJS v2 admin UI patterns based on service-orders implementation.
 */

import React from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Calendar, Plus, PencilSquare, EllipsisHorizontal, DocumentText, Trash } from "@medusajs/icons"
import {
  Button,
  Container,
  Heading,
  Badge,
  StatusBadge,
  Text,
  DataTable,
  useDataTable,
  createDataTableColumnHelper,
  createDataTableFilterHelper,
  DropdownMenu,
  IconButton,
  toast,
} from "@medusajs/ui"
import type { DataTableFilteringState, DataTablePaginationState } from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useMemo } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"

// TEM-207: Types for rental data matching the rental model
interface Rental {
  id: string
  rental_number: string
  status: string
  rental_type: string
  customer_id?: string
  machine_id?: string
  rental_start_date: string
  rental_end_date?: string
  start_machine_hours?: number
  end_machine_hours?: number
  total_hours_used: number
  total_rental_cost: number
  created_at: string
  updated_at: string
  // Linked data from module links
  customer?: {
    id: string
    first_name?: string
    last_name?: string
    email?: string
  }
  machine?: {
    id: string
    machine_number?: string
    brand?: string
    model?: string
  }
}

const PAGE_SIZE = 20

// TEM-207: Create filter helper
const filterHelper = createDataTableFilterHelper<Rental>()

// TEM-207: Filters for status, rental type, and start date
const useRentalFilters = () => {
  return [
    filterHelper.accessor("status", {
      label: "Status",
      type: "select",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Active", value: "active" },
        { label: "Completed", value: "completed" },
        { label: "Cancelled", value: "cancelled" },
      ],
    }),
    filterHelper.accessor("rental_type", {
      label: "Rental Type",
      type: "select",
      options: [
        { label: "Hourly", value: "hourly" },
        { label: "Daily", value: "daily" },
        { label: "Weekly", value: "weekly" },
        { label: "Monthly", value: "monthly" },
      ],
    }),
    filterHelper.accessor("rental_start_date", {
      label: "Start Date",
      type: "date",
      format: "date",
      options: [],
    }),
  ]
}

// TEM-207: Data fetching hook with proper pagination support
const useRentals = (query?: any) => {
  return useQuery({
    queryKey: ["rentals", query],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (query?.limit) searchParams.set('limit', query.limit.toString())
      if (query?.offset) searchParams.set('offset', query.offset.toString())
      if (query?.q) searchParams.set('q', query.q)
      if (query?.status) searchParams.set('status', query.status)
      if (query?.rental_type) searchParams.set('rental_type', query.rental_type)
      if (query?.customer_id) searchParams.set('customer_id', query.customer_id)
      if (query?.machine_id) searchParams.set('machine_id', query.machine_id)

      const response = await fetch(`/admin/rentals?${searchParams.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to fetch rentals")
      }
      const data = await response.json()
      return {
        rentals: data.rentals || [],
        count: data.count || 0
      }
    },
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  })
}

// TEM-207: Query hook following native Medusa pattern for URL sync
const useRentalTableQuery = ({
  pageSize = 20,
}: {
  pageSize?: number
}) => {
  const [searchParams, setSearchParams] = useSearchParams()

  const offset = searchParams.get("offset")
  const q = searchParams.get("q")
  const status = searchParams.get("status")
  const rental_type = searchParams.get("rental_type")
  const customer_id = searchParams.get("customer_id")
  const machine_id = searchParams.get("machine_id")

  const queryParams = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    q: q || undefined,
    status: status || undefined,
    rental_type: rental_type || undefined,
    customer_id: customer_id || undefined,
    machine_id: machine_id || undefined,
  }

  // Function to update URL parameters
  const updateParams = (updates: Record<string, string | number | null>) => {
    setSearchParams((prevParams) => {
      const newParams = new URLSearchParams(prevParams)

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          newParams.set(key, value.toString())
        } else {
          newParams.delete(key)
        }
      })

      return newParams
    })
  }

  return {
    searchParams: queryParams,
    updateParams,
    raw: Object.fromEntries(searchParams.entries()),
  }
}

// TEM-207: Rental actions component with Edit, Delete, and Generate Invoice
const RentalActions = ({ rental }: { rental: Rental }) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Handle generate invoice action
  const handleGenerateInvoice = async (rentalId: string) => {
    try {
      const response = await fetch(`/admin/rentals/${rentalId}/invoice`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error("Failed to generate invoice")
      }
      const data = await response.json()
      toast.success("Invoice generated", {
        description: `Invoice ${data.invoice?.display_id || ''} created successfully`,
      })
      queryClient.invalidateQueries({ queryKey: ["rentals"] })
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to generate invoice",
      })
    }
  }

  // Handle delete action
  const handleDelete = async (rentalId: string) => {
    if (!confirm("Are you sure you want to delete this rental?")) {
      return
    }
    try {
      const response = await fetch(`/admin/rentals/${rentalId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error("Failed to delete rental")
      }
      toast.success("Rental deleted", {
        description: "Rental has been deleted successfully",
      })
      queryClient.invalidateQueries({ queryKey: ["rentals"] })
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to delete rental",
      })
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
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/rentals/${rental.id}`)
          }}
          className="[&>svg]:text-ui-fg-subtle flex items-center gap-2"
        >
          <PencilSquare className="h-4 w-4" />
          Edit
        </DropdownMenu.Item>
        <DropdownMenu.Item
          onClick={(e) => {
            e.stopPropagation()
            handleGenerateInvoice(rental.id)
          }}
          className="[&>svg]:text-ui-fg-subtle flex items-center gap-2"
        >
          <DocumentText className="h-4 w-4" />
          Generate Invoice
        </DropdownMenu.Item>
        <DropdownMenu.Item
          onClick={(e) => {
            e.stopPropagation()
            handleDelete(rental.id)
          }}
          className="[&>svg]:text-ui-fg-subtle flex items-center gap-2 text-ui-fg-error"
        >
          <Trash className="h-4 w-4" />
          Delete
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}

// TEM-207: Route config with Calendar icon (rentals are time-based)
export const config = defineRouteConfig({
  label: "Rentals",
  icon: Calendar,
})

// TEM-207: Breadcrumb configuration
export const handle = {
  breadcrumb: () => "Rentals",
}

// TEM-207: Rentals list DataTable component
const RentalsDataTable = () => {
  const navigate = useNavigate()
  const { searchParams, updateParams } = useRentalTableQuery({
    pageSize: PAGE_SIZE,
  })

  const { data, isLoading, error } = useRentals(searchParams)
  const filters = useRentalFilters()

  // State management for search and filtering
  const [search, setSearch] = React.useState("")
  const [filtering, setFiltering] = React.useState<DataTableFilteringState>({})

  // Sync search with URL parameters
  React.useEffect(() => {
    if (searchParams.q !== search) {
      setSearch(searchParams.q || "")
    }
  }, [searchParams.q])

  // Handle search changes with URL sync
  const handleSearchChange = (value: string) => {
    setSearch(value)
    updateParams({ q: value || null, offset: 0 })
  }

  // Handle filtering changes with URL sync
  const handleFilteringChange = (filters: DataTableFilteringState) => {
    setFiltering(filters)
    updateParams({ offset: 0 })
  }

  // Data processing
  const rentals = data?.rentals || []
  const count = data?.count || 0

  // TEM-207: Status badge with appropriate colors
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: any }> = {
      draft: { label: "Draft", color: "grey" },
      active: { label: "Active", color: "orange" },
      completed: { label: "Completed", color: "green" },
      cancelled: { label: "Cancelled", color: "red" },
    }
    const config = statusConfig[status] || { label: status, color: "grey" }
    return <StatusBadge color={config.color}>{config.label}</StatusBadge>
  }

  // TEM-207: Rental type badge
  const getRentalTypeBadge = (rentalType: string) => {
    const typeConfig: Record<string, { label: string; color: any }> = {
      hourly: { label: "Hourly", color: "blue" },
      daily: { label: "Daily", color: "green" },
      weekly: { label: "Weekly", color: "purple" },
      monthly: { label: "Monthly", color: "orange" },
    }
    const config = typeConfig[rentalType] || { label: rentalType, color: "grey" }
    return <Badge color={config.color} size="2xsmall">{config.label}</Badge>
  }

  // TEM-207: Column helper and columns definition
  const columnHelper = createDataTableColumnHelper<Rental>()

  const columns = [
    // TEM-207: Rental Number (clickable to detail view)
    columnHelper.accessor("rental_number", {
      header: "Rental Number",
      enableSorting: true,
      cell: ({ getValue }) => (
        <Text className="font-medium">{getValue()}</Text>
      ),
    }),
    // TEM-207: Customer Name (from linked customer)
    columnHelper.accessor("customer", {
      header: "Customer",
      cell: ({ getValue }) => {
        const customer = getValue()
        if (!customer) return <Text className="text-ui-fg-muted">—</Text>
        return (
          <Text>
            {customer.first_name && customer.last_name
              ? `${customer.first_name} ${customer.last_name}`
              : customer.email || "Unknown"}
          </Text>
        )
      },
    }),
    // TEM-207: Machine Name (from linked machine)
    columnHelper.accessor("machine", {
      header: "Machine",
      cell: ({ getValue }) => {
        const machine = getValue()
        if (!machine) return <Text className="text-ui-fg-muted">—</Text>
        return (
          <Text>
            {machine.machine_number || `${machine.brand || ''} ${machine.model || ''}`.trim() || "Unknown"}
          </Text>
        )
      },
    }),
    // TEM-207: Rental Type (badge)
    columnHelper.accessor("rental_type", {
      header: "Type",
      cell: ({ getValue }) => getRentalTypeBadge(getValue()),
    }),
    // TEM-207: Status (badge with colors)
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ getValue }) => getStatusBadge(getValue()),
    }),
    // TEM-207: Start Date
    columnHelper.accessor("rental_start_date", {
      header: "Start Date",
      cell: ({ getValue }) => {
        const date = getValue()
        if (!date) return <Text className="text-ui-fg-muted">—</Text>
        return (
          <Text>
            {new Date(date).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })}
          </Text>
        )
      },
    }),
    // TEM-207: Hours Used (calculated field)
    columnHelper.accessor("total_hours_used", {
      header: "Hours Used",
      cell: ({ getValue }) => {
        const hours = getValue() || 0
        return (
          <Text className="font-mono">
            {hours.toFixed(1)}h
          </Text>
        )
      },
    }),
    // TEM-207: Total Cost (formatted as currency €X.XX)
    columnHelper.accessor("total_rental_cost", {
      header: "Total Cost",
      cell: ({ getValue }) => {
        const cost = getValue() || 0
        return (
          <Text className="font-mono">
            €{(cost / 100).toFixed(2)}
          </Text>
        )
      },
    }),
    // TEM-207: Actions (dropdown menu)
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => <RentalActions rental={row.original} />,
    }),
  ]

  // Current pagination state from URL
  const currentPage = Math.floor((searchParams.offset || 0) / PAGE_SIZE)

  // TEM-207: DataTable setup with pagination, search, and filtering
  const table = useDataTable({
    data: rentals ?? [],
    columns,
    rowCount: count,
    getRowId: (row) => row.id,
    pagination: {
      state: {
        pageIndex: currentPage,
        pageSize: PAGE_SIZE,
      },
      onPaginationChange: (pagination: any) => {
        const pageIndex = typeof pagination === 'function'
          ? pagination({ pageIndex: currentPage, pageSize: PAGE_SIZE }).pageIndex
          : pagination.pageIndex
        updateParams({ offset: pageIndex * PAGE_SIZE })
      },
    },
    search: {
      state: search,
      onSearchChange: handleSearchChange,
    },
    filtering: {
      state: filtering,
      onFilteringChange: handleFilteringChange,
    },
    filters,
    // TEM-207: Clicking row navigates to detail view
    onRowClick: (_event, row) => {
      navigate(`/rentals/${row.id}`)
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
    <div className="overflow-hidden">
      <DataTable instance={table}>
        <DataTable.Toolbar className="flex items-center justify-between gap-4 px-6 py-4 bg-ui-bg-subtle/30">
          <div className="flex items-center gap-2">
            <DataTable.FilterMenu />
          </div>
          <div className="flex items-center gap-2">
            <DataTable.Search placeholder="Search rentals..." className="w-80" />
          </div>
        </DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>
    </div>
  )
}

// TEM-207: Main rentals list component
const RentalsList = () => {
  const { data } = useRentals({ limit: 1 })
  const count = data?.count || 0

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>Rentals</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Manage machine rentals with hour-based billing ({count} rentals)
          </Text>
        </div>
        {/* TEM-207: Create Rental button linking to create page */}
        <Button size="small" variant="secondary" asChild>
          <Link to="/rentals/create">
            <Plus className="w-4 h-4 mr-2" />
            Create Rental
          </Link>
        </Button>
      </div>

      <RentalsDataTable />
    </Container>
  )
}

// TEM-207: Main rentals page component
const RentalsPage = () => {
  return <RentalsList />
}

export default RentalsPage
