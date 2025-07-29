import React from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { PencilSquare, Plus, Tools, EllipsisHorizontal, SquareTwoStack, ChevronUpMini, ChevronDownMini, ChevronRightMini, ExclamationCircle, DocumentText, ArrowUpTray, Trash } from "@medusajs/icons"
import {
  Button,
  Container,
  Heading,
  Badge,
  StatusBadge,
  Text,
  Input,
  Select,
  DatePicker,
  Tabs,
  DataTable,
  useDataTable,
  createDataTableColumnHelper,
  createDataTableFilterHelper,
  toast,
  DropdownMenu,
  IconButton,
} from "@medusajs/ui"
import type { DataTableFilteringState, DataTablePaginationState } from "@medusajs/ui"
import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useCustomTranslation } from "../../hooks/use-custom-translation"

import { KanbanView } from "./components/kanban-view"
import { EditServiceOrderForm } from "../../components/edit-service-order-form"
import { ServiceTypeLabel } from "../../components/common/service-type-label"

// Types for service order data
interface ServiceOrder {
  id: string
  service_order_number: string
  status: string
  priority: string
  service_type: string
  service_location: string
  description: string
  customer_id?: string
  technician_id?: string
  machine_id?: string
  scheduled_start_date?: string
  total_cost: number
  created_at: string
  updated_at: string
}

const PAGE_SIZE = 20

// Create filter helper
const filterHelper = createDataTableFilterHelper<ServiceOrder>()

// Service Order filters following native Medusa pattern
const useServiceOrderFilters = () => {
  const { t } = useCustomTranslation()
  
  return [
    filterHelper.accessor("status", {
      label: t("custom.general.status"),
      type: "select",
      options: [
        { label: t("custom.serviceOrders.status.draft"), value: "draft" },
        { label: t("custom.serviceOrders.status.ready_for_pickup"), value: "ready_for_pickup" },
        { label: t("custom.serviceOrders.status.in_progress"), value: "in_progress" },
        { label: t("custom.serviceOrders.status.done"), value: "done" },
        { label: t("custom.serviceOrders.status.returned_for_review"), value: "returned_for_review" },
      ],
    }),
    filterHelper.accessor("priority", {
      label: t("custom.serviceOrders.priority"),
      type: "select",
      options: [
        { label: t("custom.serviceOrders.priorities.low"), value: "low" },
        { label: t("custom.serviceOrders.priorities.normal"), value: "normal" },
        { label: t("custom.serviceOrders.priorities.high"), value: "high" },
        { label: t("custom.serviceOrders.priorities.urgent"), value: "urgent" },
      ],
    }),
    filterHelper.accessor("created_at", {
      label: t("custom.general.created"),
      type: "date",
      format: "date",
      options: [],
    }),
    filterHelper.accessor("scheduled_start_date", {
      label: "Scheduled Date",
      type: "date",
      format: "date",
      options: [],
    }),
  ]
}

// Data fetching hooks with proper pagination support
const useServiceOrders = (query?: any) => {
  return useQuery({
    queryKey: ["service-orders", query],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (query?.limit) searchParams.set('limit', query.limit.toString())
      if (query?.offset) searchParams.set('offset', query.offset.toString())
      if (query?.q) searchParams.set('q', query.q)
      if (query?.status) searchParams.set('status', query.status)
      if (query?.priority) searchParams.set('priority', query.priority)
      if (query?.service_type) searchParams.set('service_type', query.service_type)
      if (query?.customer_id) searchParams.set('customer_id', query.customer_id)
      if (query?.technician_id) searchParams.set('technician_id', query.technician_id)
      if (query?.tab) searchParams.set('tab', query.tab) // Add tab parameter
      
      const response = await fetch(`/admin/service-orders?${searchParams.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to fetch service orders")
      }
      const data = await response.json()
      return {
        service_orders: data.service_orders || [],
        count: data.count || 0
      }
    },
    staleTime: 0, // Always consider data stale to ensure fresh data
    gcTime: 5 * 60 * 1000,
  })
}

// Hook to fetch customers for display
const useCustomers = () => {
  return useQuery({
    queryKey: ["service-orders-customers"],
    queryFn: async () => {
      const response = await fetch(`/admin/customers?limit=1000`)
      if (!response.ok) throw new Error("Failed to fetch customers")
      const data = await response.json()
      return {
        customers: data.customers || [],
        count: data.count || 0
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Hook to fetch technicians for display
const useTechnicians = () => {
  return useQuery({
    queryKey: ["service-orders-technicians"],
    queryFn: async () => {
      const response = await fetch(`/admin/technicians?limit=1000`)
      if (!response.ok) throw new Error("Failed to fetch technicians")
      const data = await response.json()
      return {
        technicians: data.technicians || [],
        count: data.count || 0
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Service order table query hook following native Medusa pattern
const useServiceOrderTableQuery = ({
  prefix,
  pageSize = 20,
}: {
  prefix?: string
  pageSize?: number
}) => {
  const [searchParams, setSearchParams] = useSearchParams()
  
  const offsetKey = prefix ? `${prefix}_offset` : "offset"
  const qKey = prefix ? `${prefix}_q` : "q"
  const statusKey = prefix ? `${prefix}_status` : "status"
  const priorityKey = prefix ? `${prefix}_priority` : "priority"
  const serviceTypeKey = prefix ? `${prefix}_service_type` : "service_type"
  const customerIdKey = prefix ? `${prefix}_customer_id` : "customer_id"
  const technicianIdKey = prefix ? `${prefix}_technician_id` : "technician_id"

  const offset = searchParams.get(offsetKey)
  const q = searchParams.get(qKey)
  const status = searchParams.get(statusKey)
  const priority = searchParams.get(priorityKey)
  const service_type = searchParams.get(serviceTypeKey)
  const customer_id = searchParams.get(customerIdKey)
  const technician_id = searchParams.get(technicianIdKey)

  const queryParams = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    q: q || undefined,
    status: status || undefined,
    priority: priority || undefined,
    service_type: service_type || undefined,
    customer_id: customer_id || undefined,
    technician_id: technician_id || undefined,
  }

  // Function to update URL parameters
  const updateParams = (updates: Record<string, string | number | null>) => {
    setSearchParams((prevParams) => {
      const newParams = new URLSearchParams(prevParams)
      
      Object.entries(updates).forEach(([key, value]) => {
        const paramKey = prefix ? `${prefix}_${key}` : key
        if (value !== null && value !== undefined && value !== '') {
          newParams.set(paramKey, value.toString())
        } else {
          newParams.delete(paramKey)
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

// Service order actions component
const ServiceOrderActions = ({ serviceOrder }: { serviceOrder: ServiceOrder }) => {
  const { t } = useCustomTranslation()
  const navigate = useNavigate()

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <IconButton size="small" variant="transparent">
          <EllipsisHorizontal className="h-4 w-4" />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content side="bottom">
        <EditServiceOrderForm 
          serviceOrder={serviceOrder} 
          trigger={
            <DropdownMenu.Item
              onSelect={(e) => {
                e.preventDefault()
              }}
              className="[&>svg]:text-ui-fg-subtle flex items-center gap-2"
            >
              <PencilSquare className="h-4 w-4" />
              {t("custom.general.edit")}
            </DropdownMenu.Item>
          }
        />
        <DropdownMenu.Item
          onClick={(e) => {
            e.stopPropagation()
            // TODO: Add delete service order functionality
            console.log('Delete service order:', serviceOrder.id)
          }}
          className="[&>svg]:text-ui-fg-subtle flex items-center gap-2 text-ui-fg-error"
        >
          <Trash className="h-4 w-4" />
          {t("custom.general.delete")}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}

// Route config
export const config = defineRouteConfig({
  label: "Service Orders",
  icon: Tools,
})

// Service Orders list table component for backlog - following official DataTable pattern
const BacklogDataTable = () => {
  const { t } = useCustomTranslation()
  const navigate = useNavigate()
  const { searchParams, updateParams } = useServiceOrderTableQuery({
    pageSize: PAGE_SIZE,
    prefix: "backlog"
  })
  
  // Add tab parameter for server-side filtering
  const backlogParams = { ...searchParams, tab: "backlog" }
  
  console.log('BacklogDataTable params:', backlogParams)
  
  const { data, isLoading, error } = useServiceOrders(backlogParams)
  const { data: customersData } = useCustomers()
  const { data: techniciansData } = useTechnicians()
  const filters = useServiceOrderFilters()

  // State management for search, filtering, and pagination
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
    updateParams({ q: value || null, offset: 0 }) // Reset to first page when searching
  }

  // Handle filtering changes with URL sync
  const handleFilteringChange = (filters: DataTableFilteringState) => {
    setFiltering(filters)
    // You can add URL sync for filters here if needed
    updateParams({ offset: 0 }) // Reset to first page when filtering
  }

  // Extract arrays from data - following MedusaJS native patterns
  const customers = customersData?.customers || []
  const technicians = techniciansData?.technicians || []

  // Create lookup maps for efficient customer/technician display
  const customerLookup = React.useMemo(() => {
    const map = new Map()
    if (Array.isArray(customers)) {
      customers.forEach((customer: any) => {
        map.set(customer.id, customer)
      })
    }
    return map
  }, [customers])
  
  const technicianLookup = React.useMemo(() => {
    const map = new Map()
    if (Array.isArray(technicians)) {
      technicians.forEach((technician: any) => {
        map.set(technician.id, technician)
      })
    }
    return map
  }, [technicians])

  // Data processing - server-side filtered, no client-side filtering needed
  const serviceOrders = data?.service_orders || []
  const count = data?.count || 0

  // Status and priority badge functions
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: any }> = {
      draft: { label: t("custom.serviceOrders.status.draft"), color: "grey" },
      ready_for_pickup: { label: t("custom.serviceOrders.status.ready_for_pickup"), color: "blue" },
      in_progress: { label: t("custom.serviceOrders.status.in_progress"), color: "orange" },
      done: { label: t("custom.serviceOrders.status.done"), color: "green" },
      returned_for_review: { label: t("custom.serviceOrders.status.returned_for_review"), color: "red" },
    }
    const config = statusConfig[status] || { label: status, color: "grey" }
    return <StatusBadge color={config.color}>{config.label}</StatusBadge>
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { label: string; color: any }> = {
      low: { label: t("custom.serviceOrders.priorities.low"), color: "green" },
      normal: { label: t("custom.serviceOrders.priorities.normal"), color: "blue" },
      high: { label: t("custom.serviceOrders.priorities.high"), color: "orange" },
      urgent: { label: t("custom.serviceOrders.priorities.urgent"), color: "red" },
    }
    const config = priorityConfig[priority] || { label: priority, color: "grey" }
    return <StatusBadge color={config.color}>{config.label}</StatusBadge>
  }

  const getServiceTypeBadge = (serviceType: string) => {
    const typeConfig: Record<string, { label: string; color: any }> = {
      standard: { label: t("custom.serviceOrders.service_types.standard"), color: "green" },
      warranty: { label: t("custom.serviceOrders.service_types.warranty"), color: "purple" },
      internal: { label: t("custom.serviceOrders.service_types.internal"), color: "red" },
      insurance: { label: t("custom.serviceOrders.service_types.insurance"), color: "blue" },
      sales_prep: { label: t("custom.serviceOrders.service_types.sales_prep"), color: "orange" },
      quote: { label: t("custom.serviceOrders.service_types.quote"), color: "orange" },
    }
    const config = typeConfig[serviceType] || { label: serviceType, color: "grey" }
    return <Badge color={config.color}>{config.label}</Badge>
  }

  // Column helper and columns definition
  const columnHelper = createDataTableColumnHelper<ServiceOrder>()

  const columns = [
    columnHelper.accessor("service_order_number", {
      header: "Order Number",
      enableSorting: true,
      cell: ({ getValue }) => (
        <Text className="font-medium">{getValue()}</Text>
      ),
    }),
    columnHelper.accessor("service_type", {
      header: t("custom.serviceOrders.service_type"),
      cell: ({ getValue }) => getServiceTypeBadge(getValue()),
    }),
    columnHelper.accessor("customer_id", {
      header: t("custom.serviceOrders.customer"),
      cell: ({ getValue }) => {
        const customerId = getValue()
        if (!customerId) return <Text className="text-ui-fg-muted">—</Text>
        const customer = customerLookup.get(customerId)
        if (!customer) return <Text className="text-ui-fg-muted">Unknown</Text>
        return (
          <Text>
            {customer.first_name && customer.last_name 
              ? `${customer.first_name} ${customer.last_name}`
              : customer.email || "Unknown"}
          </Text>
        )
      },
    }),
    columnHelper.accessor("technician_id", {
      header: t("custom.serviceOrders.technician"),
      cell: ({ getValue }) => {
        const technicianId = getValue()
        if (!technicianId) return <Text className="text-ui-fg-muted">—</Text>
        const technician = technicianLookup.get(technicianId)
        if (!technician) return <Text className="text-ui-fg-muted">Unassigned</Text>
        return (
          <Text>
            {technician.first_name && technician.last_name 
              ? `${technician.first_name} ${technician.last_name}`
              : technician.email || "Unknown"}
          </Text>
        )
      },
    }),
    columnHelper.accessor("priority", {
      header: t("custom.serviceOrders.priority"),
      cell: ({ getValue }) => getPriorityBadge(getValue()),
    }),
    columnHelper.accessor("status", {
      header: t("custom.general.status"),
      cell: ({ getValue }) => getStatusBadge(getValue()),
    }),
    columnHelper.accessor("total_cost", {
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
    columnHelper.display({
      id: "actions",
      header: t("custom.general.actions"),
      cell: ({ row }) => <ServiceOrderActions serviceOrder={row.original} />,
    }),
  ]

  // Current pagination state from URL
  const currentPage = Math.floor((searchParams.offset || 0) / PAGE_SIZE)

  // DataTable setup using the correct API for this project
  const table = useDataTable({
    data: serviceOrders ?? [],
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
    onRowClick: (event, row) => {
      navigate(`/service-orders/${row.id}`)
    },
  })

  if (error) {
    throw error
  }

  if (isLoading) {
    return (
      <Container className="p-6">
        <div className="flex items-center justify-center h-32">
          <Text className="text-ui-fg-subtle">Loading backlog orders...</Text>
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
            <DataTable.Search placeholder="Search backlog orders..." className="w-80" />
          </div>
        </DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>
    </div>
  )
}

// Active Orders DataTable component
const ActiveOrdersDataTable = () => {
  const { t } = useCustomTranslation()
  const navigate = useNavigate()
  const { searchParams, updateParams } = useServiceOrderTableQuery({
    pageSize: PAGE_SIZE,
    prefix: "active"
  })
  
  // Add tab parameter for server-side filtering
  const activeParams = { ...searchParams, tab: "active" }
  
  console.log('ActiveOrdersDataTable params:', activeParams)
  
  const { data, isLoading, error } = useServiceOrders(activeParams)
  const { data: customersData } = useCustomers()
  const { data: techniciansData } = useTechnicians()
  const filters = useServiceOrderFilters()

  // State management for search, filtering, and pagination
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
    updateParams({ q: value || null, offset: 0 }) // Reset to first page when searching
  }

  // Handle filtering changes with URL sync
  const handleFilteringChange = (filters: DataTableFilteringState) => {
    setFiltering(filters)
    // You can add URL sync for filters here if needed
    updateParams({ offset: 0 }) // Reset to first page when filtering
  }

  // Extract arrays from data
  const customers = customersData?.customers || []
  const technicians = techniciansData?.technicians || []

  // Create lookup maps
  const customerLookup = React.useMemo(() => {
    const map = new Map()
    if (Array.isArray(customers)) {
      customers.forEach((customer: any) => {
        map.set(customer.id, customer)
      })
    }
    return map
  }, [customers])
  
  const technicianLookup = React.useMemo(() => {
    const map = new Map()
    if (Array.isArray(technicians)) {
      technicians.forEach((technician: any) => {
        map.set(technician.id, technician)
      })
    }
    return map
  }, [technicians])

  // Data processing - server-side filtered, no client-side filtering needed
  const serviceOrders = data?.service_orders || []
  const count = data?.count || 0

  // Status and priority badge functions
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: any }> = {
      draft: { label: t("custom.serviceOrders.status.draft"), color: "grey" },
      ready_for_pickup: { label: t("custom.serviceOrders.status.ready_for_pickup"), color: "blue" },
      in_progress: { label: t("custom.serviceOrders.status.in_progress"), color: "orange" },
      done: { label: t("custom.serviceOrders.status.done"), color: "green" },
      returned_for_review: { label: t("custom.serviceOrders.status.returned_for_review"), color: "red" },
    }
    const config = statusConfig[status] || { label: status, color: "grey" }
    return <StatusBadge color={config.color}>{config.label}</StatusBadge>
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { label: string; color: any }> = {
      low: { label: t("custom.serviceOrders.priorities.low"), color: "green" },
      normal: { label: t("custom.serviceOrders.priorities.normal"), color: "blue" },
      high: { label: t("custom.serviceOrders.priorities.high"), color: "orange" },
      urgent: { label: t("custom.serviceOrders.priorities.urgent"), color: "red" },
    }
    const config = priorityConfig[priority] || { label: priority, color: "grey" }
    return <StatusBadge color={config.color}>{config.label}</StatusBadge>
  }

  const getServiceTypeBadge = (serviceType: string) => {
    const typeConfig: Record<string, { label: string; color: any }> = {
      standard: { label: t("custom.serviceOrders.service_types.standard"), color: "green" },
      warranty: { label: t("custom.serviceOrders.service_types.warranty"), color: "purple" },
      internal: { label: t("custom.serviceOrders.service_types.internal"), color: "red" },
      insurance: { label: t("custom.serviceOrders.service_types.insurance"), color: "blue" },
      sales_prep: { label: t("custom.serviceOrders.service_types.sales_prep"), color: "orange" },
      quote: { label: t("custom.serviceOrders.service_types.quote"), color: "orange" },
    }
    const config = typeConfig[serviceType] || { label: serviceType, color: "grey" }
    return <Badge color={config.color}>{config.label}</Badge>
  }

  // Column helper and columns definition
  const columnHelper = createDataTableColumnHelper<ServiceOrder>()

  const columns = [
    columnHelper.accessor("service_order_number", {
      header: "Order Number",
      enableSorting: true,
      cell: ({ getValue }) => (
        <Text className="font-medium">{getValue()}</Text>
      ),
    }),
    columnHelper.accessor("service_type", {
      header: t("custom.serviceOrders.service_type"),
      cell: ({ getValue }) => getServiceTypeBadge(getValue()),
    }),
    columnHelper.accessor("customer_id", {
      header: t("custom.serviceOrders.customer"),
      cell: ({ getValue }) => {
        const customerId = getValue()
        if (!customerId) return <Text className="text-ui-fg-muted">—</Text>
        const customer = customerLookup.get(customerId)
        if (!customer) return <Text className="text-ui-fg-muted">Unknown</Text>
        return (
          <Text>
            {customer.first_name && customer.last_name 
              ? `${customer.first_name} ${customer.last_name}`
              : customer.email || "Unknown"}
          </Text>
        )
      },
    }),
    columnHelper.accessor("technician_id", {
      header: t("custom.serviceOrders.technician"),
      cell: ({ getValue }) => {
        const technicianId = getValue()
        if (!technicianId) return <Text className="text-ui-fg-muted">—</Text>
        const technician = technicianLookup.get(technicianId)
        if (!technician) return <Text className="text-ui-fg-muted">Unassigned</Text>
        return (
          <Text>
            {technician.first_name && technician.last_name 
              ? `${technician.first_name} ${technician.last_name}`
              : technician.email || "Unknown"}
          </Text>
        )
      },
    }),
    columnHelper.accessor("priority", {
      header: t("custom.serviceOrders.priority"),
      cell: ({ getValue }) => getPriorityBadge(getValue()),
    }),
    columnHelper.accessor("status", {
      header: t("custom.general.status"),
      cell: ({ getValue }) => getStatusBadge(getValue()),
    }),
    columnHelper.accessor("total_cost", {
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
    columnHelper.display({
      id: "actions",
      header: t("custom.general.actions"),
      cell: ({ row }) => <ServiceOrderActions serviceOrder={row.original} />,
    }),
  ]

  // Current pagination state from URL
  const currentPage = Math.floor((searchParams.offset || 0) / PAGE_SIZE)

  // DataTable setup using the correct API for this project
  const table = useDataTable({
    data: serviceOrders ?? [],
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
    onRowClick: (event, row) => {
      navigate(`/service-orders/${row.id}`)
    },
  })

  if (error) {
    throw error
  }

  if (isLoading) {
    return (
      <Container className="p-6">
        <div className="flex items-center justify-center h-32">
          <Text className="text-ui-fg-subtle">Loading active orders...</Text>
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
            <DataTable.Search placeholder="Search active orders..." className="w-80" />
          </div>
        </DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>
    </div>
  )
}

// Service orders list component
const ServiceOrdersList = () => {
  const { t } = useCustomTranslation()
  const [activeTab, setActiveTab] = useState("active")
  const [activeView, setActiveView] = useState("list") // "list" or "kanban"
  
  const { data, isLoading, error } = useServiceOrders()

  if (error) {
    throw error
  }

  const serviceOrders = data?.service_orders || []
  const count = data?.count || 0
  const activeOrders = serviceOrders.filter((order: any) => order.status !== "draft")
  const backlogCount = serviceOrders.filter((order: any) => order.status === "draft").length

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("custom.serviceOrders.title")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Manage your service requests and work orders ({count} orders)
          </Text>
        </div>
        <Button size="small" variant="secondary" asChild>
          <Link to="/service-orders/create">
            <Plus className="w-4 h-4 mr-2" />
            {t("custom.serviceOrders.create")}
          </Link>
        </Button>
      </div>
      
      {/* Tab Navigation */}
      <div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="px-6 py-3 border-b border-ui-border-base">
            <div className="flex items-center justify-between">
              <Tabs.List className="bg-ui-bg-subtle">
                <Tabs.Trigger value="backlog" className="flex items-center gap-2">
                  <DocumentText className="w-4 h-4" />
                  Backlog
                  {backlogCount > 0 && (
                    <Badge size="2xsmall" className="ml-1">
                      {backlogCount}
                    </Badge>
                  )}
                </Tabs.Trigger>
                <Tabs.Trigger value="active" className="flex items-center gap-2">
                  <Tools className="w-4 h-4" />
                  Active
                  {activeOrders.length > 0 && (
                    <Badge size="2xsmall" className="ml-1">
                      {activeOrders.length}
                    </Badge>
                  )}
                </Tabs.Trigger>
              </Tabs.List>
              
              {/* View Toggle - only show when Active tab is selected */}
              {activeTab === "active" && (
                <div className="flex items-center gap-2">
                  <Button
                    size="small"
                    variant={activeView === "list" ? "primary" : "secondary"}
                    onClick={() => setActiveView("list")}
                    className="flex items-center gap-2"
                  >
                    <Tools className="w-4 h-4" />
                    List
                  </Button>
                  <Button
                    size="small"
                    variant={activeView === "kanban" ? "primary" : "secondary"}
                    onClick={() => setActiveView("kanban")}
                    className="flex items-center gap-2"
                  >
                    <SquareTwoStack className="w-4 h-4" />
                    Kanban
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          <Tabs.Content value="backlog" className="mt-0" key="backlog-tab">
            <BacklogDataTable />
          </Tabs.Content>

          <Tabs.Content value="active" className="mt-0" key="active-tab">
            {activeView === "list" ? (
              <ActiveOrdersDataTable />
            ) : (
              <div className="p-6">
                <KanbanView 
                  serviceOrders={activeOrders}
                  isLoading={isLoading}
                  onRefetch={() => {}}
                />
              </div>
            )}
          </Tabs.Content>
        </Tabs>
      </div>
    </Container>
  )
}

// Main service orders page component
const ServiceOrdersPage = () => {
  return <ServiceOrdersList />
}

export default ServiceOrdersPage