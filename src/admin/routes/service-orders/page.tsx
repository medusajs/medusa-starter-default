import React from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { PencilSquare, Plus, Tools, EllipsisHorizontal, SquareTwoStack } from "@medusajs/icons"
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
  IconButton,
  DataTable,
  useDataTable,
  createDataTableColumnHelper,
  createDataTableFilterHelper,
  toast,
} from "@medusajs/ui"
import type { DataTableFilteringState } from "@medusajs/ui"
import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { KanbanView } from "./components/kanban-view"

// Types for service order data
interface ServiceOrder {
  id: string
  service_order_number: string
  status: string
  priority: string
  description: string
  customer?: {
    first_name: string
    last_name: string
  }
  technician?: {
    first_name: string
    last_name: string
  }
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
  return [
    filterHelper.accessor("status", {
      label: "Status",
      type: "select",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Scheduled", value: "scheduled" },
        { label: "In Progress", value: "in_progress" },
        { label: "Waiting Parts", value: "waiting_parts" },
        { label: "Customer Approval", value: "customer_approval" },
        { label: "Completed", value: "completed" },
        { label: "Cancelled", value: "cancelled" },
      ],
    }),
    filterHelper.accessor("priority", {
      label: "Priority",
      type: "select",
      options: [
        { label: "Low", value: "low" },
        { label: "Normal", value: "normal" },
        { label: "High", value: "high" },
        { label: "Urgent", value: "urgent" },
      ],
    }),
    filterHelper.accessor("created_at", {
      label: "Created At",
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

// Data fetching hook
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
  })
}

// Service order actions component
const ServiceOrderActions = ({ serviceOrder }: { serviceOrder: ServiceOrder }) => {
  const navigate = useNavigate()

  return (
    <div className="flex items-center gap-1">
      <IconButton
        size="small"
        variant="transparent"
        onClick={(e) => {
          e.stopPropagation()
          navigate(`/service-orders/${serviceOrder.id}`)
        }}
      >
        <Tools className="h-4 w-4" />
      </IconButton>
      <IconButton
        size="small"
        variant="transparent"
        onClick={(e) => {
          e.stopPropagation()
          navigate(`/service-orders/${serviceOrder.id}/edit`)
        }}
      >
        <PencilSquare className="h-4 w-4" />
      </IconButton>
    </div>
  )
}

// Route config
export const config = defineRouteConfig({
  label: "Service Orders",
  icon: Tools,
})

// Service Orders list table component - following official DataTable pattern
const ServiceOrdersListTable = () => {
  const navigate = useNavigate()
  const { data, isLoading, error } = useServiceOrders()
  const filters = useServiceOrderFilters()
  
  // Filter state management
  const [search, setSearch] = React.useState("")
  const [filtering, setFiltering] = React.useState<DataTableFilteringState>({})

  if (error) {
    throw error
  }

  const serviceOrders = data?.service_orders || []
  const count = data?.count || 0

  // Status and priority variants
  const statusVariants = {
    draft: "orange",
    scheduled: "blue", 
    in_progress: "purple",
    waiting_parts: "orange",
    customer_approval: "orange",
    completed: "green",
    cancelled: "red",
  } as const

  const priorityVariants = {
    low: "grey",
    normal: "blue",
    high: "orange", 
    urgent: "red",
  } as const

  // Column helper - following official pattern
  const columnHelper = createDataTableColumnHelper<ServiceOrder>()

  const columns = [
    columnHelper.accessor("service_order_number", {
      header: "Order Number",
      enableSorting: true,
      cell: ({ getValue }) => (
        <Text className="font-medium">{getValue()}</Text>
      ),
    }),
    columnHelper.accessor("customer", {
      header: "Customer",
      cell: ({ getValue }) => {
        const customer = getValue()
        return (
          <Text>{customer ? `${customer.first_name} ${customer.last_name}` : "—"}</Text>
        )
      },
    }),
    columnHelper.accessor("technician", {
      header: "Technician", 
      cell: ({ getValue }) => {
        const technician = getValue()
        return (
          <Text>{technician ? `${technician.first_name} ${technician.last_name}` : "—"}</Text>
        )
      },
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ getValue }) => (
        <Badge 
          size="2xsmall"
          color={statusVariants[getValue() as keyof typeof statusVariants] || "grey"}
        >
          {getValue().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </Badge>
      ),
    }),
    columnHelper.accessor("priority", {
      header: "Priority",
      cell: ({ getValue }) => (
        <Badge 
          size="2xsmall"
          color={priorityVariants[getValue() as keyof typeof priorityVariants] || "grey"}
        >
          {getValue().charAt(0).toUpperCase() + getValue().slice(1)}
        </Badge>
      ),
    }),
    columnHelper.accessor("total_cost", {
      header: "Total Cost",
      cell: ({ getValue }) => (
        <Text size="small">€{getValue()?.toFixed(2) || "0.00"}</Text>
      ),
    }),
    columnHelper.accessor("created_at", {
      header: "Created",
      cell: ({ getValue }) => (
        <Text size="small">
          {new Date(getValue()).toLocaleDateString()}
        </Text>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => <ServiceOrderActions serviceOrder={row.original} />,
    }),
  ]

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
  })

  return (
    <DataTable instance={table}>
      <DataTable.Toolbar className="flex items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-2">
          <DataTable.FilterMenu tooltip="Filter service orders" />
        </div>
        <div className="flex items-center gap-2">
          <DataTable.Search placeholder="Search service orders..." />
        </div>
      </DataTable.Toolbar>
      <DataTable.Table />
      <DataTable.Pagination />
    </DataTable>
  )
}

// Service orders list component
const ServiceOrdersList = () => {
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
          <Heading>Service Orders</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Manage your service requests and work orders ({count} orders)
          </Text>
        </div>
        <Button size="small" variant="secondary" asChild>
          <Link to="/service-orders/create">
            <Plus className="w-4 h-4 mr-2" />
            Create Service Order
          </Link>
        </Button>
      </div>
      
      {/* Tab Navigation */}
      <div className="px-6 py-4 border-b">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Trigger value="list">
              <Tools className="w-4 h-4 mr-2" />
              List View
            </Tabs.Trigger>
            <Tabs.Trigger value="kanban">
              <SquareTwoStack className="w-4 h-4 mr-2" />
              Kanban Board
            </Tabs.Trigger>
          </Tabs.List>
          
          <div className="overflow-hidden">
            <Tabs.Content value="list">
              <ServiceOrdersListTable />
            </Tabs.Content>

            <Tabs.Content value="kanban">
              <KanbanView 
                serviceOrders={serviceOrders}
                isLoading={isLoading}
                onRefetch={() => {}}
              />
            </Tabs.Content>
          </div>
        </Tabs>
      </div>
    </Container>
  )
}

export default ServiceOrdersList 