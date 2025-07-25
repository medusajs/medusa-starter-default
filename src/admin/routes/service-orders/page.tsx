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
import type { DataTableFilteringState } from "@medusajs/ui"
import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useCustomTranslation } from "../../hooks/use-custom-translation"

import { KanbanView } from "./components/kanban-view"
import { EditServiceOrderForm } from "../../components/edit-service-order-form"

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
        { label: t("custom.serviceOrders.status.scheduled"), value: "scheduled" },
        { label: t("custom.serviceOrders.status.in_progress"), value: "in_progress" },
        { label: t("custom.serviceOrders.status.waiting_parts"), value: "waiting_parts" },
        { label: t("custom.serviceOrders.status.customer_approval"), value: "customer_approval" },
        { label: t("custom.serviceOrders.status.completed"), value: "completed" },
        { label: t("custom.serviceOrders.status.cancelled"), value: "cancelled" },
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

// Data fetching hooks
const useServiceOrders = () => {
  return useQuery({
    queryKey: ["service-orders"],
    queryFn: async () => {
      const response = await fetch(`/admin/service-orders`)
      if (!response.ok) {
        throw new Error("Failed to fetch service orders")
      }
      const data = await response.json()
      return {
        service_orders: data.service_orders || [],
        count: data.count || 0
      }
    },
    staleTime: 30000,
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

// Service Orders list table component - following official DataTable pattern
const ServiceOrdersListTable = () => {
  const { t } = useCustomTranslation()
  const navigate = useNavigate()
  const { data, isLoading, error } = useServiceOrders()
  const { data: customersData } = useCustomers()
  const { data: techniciansData } = useTechnicians()
  const filters = useServiceOrderFilters()
  
  // Filter state management
  const [search, setSearch] = React.useState("")
  const [filtering, setFiltering] = React.useState<DataTableFilteringState>({})
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  })

  // Extract arrays from data - following MedusaJS native patterns
  const customers = customersData?.customers || []
  const technicians = techniciansData?.technicians || []

  // Create lookup maps for efficient customer/technician display (moved before conditional returns)
  const customerLookup = React.useMemo(() => {
    const map = new Map()
    // Ensure customers is an array before calling forEach
    if (Array.isArray(customers)) {
      customers.forEach((customer: any) => {
        map.set(customer.id, customer)
      })
    }
    return map
  }, [customers])
  
  const technicianLookup = React.useMemo(() => {
    const map = new Map()
    // Ensure technicians is an array before calling forEach
    if (Array.isArray(technicians)) {
      technicians.forEach((technician: any) => {
        map.set(technician.id, technician)
      })
    }
    return map
  }, [technicians])

  // Data processing (move before conditional returns)
  const serviceOrders = data?.service_orders || []
  const count = data?.count || 0

  // Status and priority variants (move before conditional returns)
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: "orange", label: t("custom.serviceOrders.status.draft") },
      scheduled: { color: "blue", label: t("custom.serviceOrders.status.scheduled") },
      in_progress: { color: "purple", label: t("custom.serviceOrders.status.in_progress") },
      waiting_parts: { color: "orange", label: t("custom.serviceOrders.status.waiting_parts") },
      customer_approval: { color: "orange", label: t("custom.serviceOrders.status.customer_approval") },
      completed: { color: "green", label: t("custom.serviceOrders.status.completed") },
      cancelled: { color: "red", label: t("custom.serviceOrders.status.cancelled") },
    } as const

    const config = statusConfig[status as keyof typeof statusConfig] || { color: "grey", label: status }
    
    return (
      <Badge size="2xsmall" color={config.color as any}>
        {config.label}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { color: "grey", label: t("custom.serviceOrders.priorities.low") },
      normal: { color: "blue", label: t("custom.serviceOrders.priorities.normal") },
      high: { color: "orange", label: t("custom.serviceOrders.priorities.high") },
      urgent: { color: "red", label: t("custom.serviceOrders.priorities.urgent") },
    } as const

    const config = priorityConfig[priority as keyof typeof priorityConfig] || { color: "grey", label: priority }
    
    return (
      <Badge size="2xsmall" color={config.color as any}>
        {config.label}
      </Badge>
    )
  }

  const getServiceTypeBadge = (serviceType: string) => {
    const typeConfig = {
      normal: { color: "blue", label: t("custom.serviceOrders.types.normal") },
      warranty: { color: "green", label: t("custom.serviceOrders.types.warranty") },
      setup: { color: "purple", label: t("custom.serviceOrders.types.setup") },
      emergency: { color: "red", label: t("custom.serviceOrders.types.emergency") },
      preventive: { color: "orange", label: t("custom.serviceOrders.types.preventive") },
    } as const

    const config = typeConfig[serviceType as keyof typeof typeConfig] || { color: "grey", label: serviceType }
    
    return (
      <Badge size="2xsmall" color={config.color as any}>
        {config.label}
      </Badge>
    )
  }

  // Column helper and columns definition (move before conditional returns)
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

  // DataTable setup (move before conditional returns)
  const table = useDataTable({
    data: serviceOrders,
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
    onRowClick: (event, row) => {
      navigate(`/service-orders/${row.id}`)
    },
  })

  // NOW we can have conditional returns after all hooks are called
  if (error) {
    throw error
  }

  // Show loading state for all dependent data
  if (isLoading) {
    return (
      <Container className="p-6">
        <div className="flex items-center justify-center h-32">
          <Text className="text-ui-fg-subtle">Loading service orders...</Text>
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
            <DataTable.Search placeholder="Search service orders..." className="w-80" />
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
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("list")
  
  const { data, isLoading, error } = useServiceOrders()

  if (error) {
    throw error
  }

  const serviceOrders = data?.service_orders || []
  const count = data?.count || 0

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
            <Tabs.List className="bg-ui-bg-subtle">
              <Tabs.Trigger value="list" className="flex items-center gap-2">
                <Tools className="w-4 h-4" />
                List View
              </Tabs.Trigger>
              <Tabs.Trigger value="kanban" className="flex items-center gap-2">
                <SquareTwoStack className="w-4 h-4" />
                Kanban Board
              </Tabs.Trigger>
            </Tabs.List>
          </div>
          
          <Tabs.Content value="list" className="mt-0" key="list-tab">
            <ServiceOrdersListTable key="service-orders-list-table" />
          </Tabs.Content>

          <Tabs.Content value="kanban" className="mt-0" key="kanban-tab">
            <div className="p-6">
              <KanbanView 
                key="service-orders-kanban-view"
                serviceOrders={serviceOrders}
                isLoading={isLoading}
                onRefetch={() => {}}
              />
            </div>
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