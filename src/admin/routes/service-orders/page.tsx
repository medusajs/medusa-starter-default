import { defineRouteConfig } from "@medusajs/admin-sdk"
import { PencilSquare, Plus, Tools, EllipsisHorizontal, SquareTwoStack } from "@medusajs/icons"
import {
  Button,
  Container,
  Heading,
  Table,
  Badge,
  StatusBadge,
  Text,
  Input,
  Select,
  DatePicker,
  Tabs,
} from "@medusajs/ui"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { Link } from "react-router-dom"
import { DropdownMenu, IconButton } from "@medusajs/ui"

import { KanbanView } from "./components/kanban-view"

const ServiceOrdersList = () => {
  const [activeTab, setActiveTab] = useState("list")
  const [searchParams, setSearchParams] = useState({
    q: "",
    status: "",
    priority: "",
    service_type: "",
    customer_id: "",
    technician_id: "",
    limit: 50,
    offset: 0,
  })

  const { data: serviceOrders, isLoading, error, refetch } = useQuery({
    queryKey: ["service-orders", searchParams],
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value) params.append(key, value.toString())
      })
      
      const response = await fetch(`/admin/service-orders?${params}`)
      if (!response.ok) throw new Error("Failed to fetch service orders")
      return response.json()
    },
    placeholderData: keepPreviousData,
  })

  // Fetch customers for filter dropdown
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await fetch('/admin/customers?limit=100')
      if (!response.ok) throw new Error('Failed to fetch customers')
      const data = await response.json()
      return data.customers || []
    },
  })

  // Fetch technicians for filter dropdown
  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: async () => {
      const response = await fetch('/admin/technicians?limit=100')
      if (!response.ok) throw new Error('Failed to fetch technicians')
      const data = await response.json()
      return data.technicians || []
    },
  })

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

  const serviceTypeLabels = {
    normal: "Normal",
    warranty: "Warranty",
    setup: "Setup",
    emergency: "Emergency", 
    preventive: "Preventive",
  }

  if (error) {
    return (
      <Container>
        <Text>Error loading service orders: {error.message}</Text>
      </Container>
    )
  }

  return (
    <Container>
      <div className="flex items-center justify-between mb-8">
        <Heading level="h1">Service Orders</Heading>
        <Button size="small" asChild>
          <Link to="/service-orders/create">
            <Plus className="w-4 h-4 mr-2" />
            Create Service Order
          </Link>
        </Button>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="mb-6">
          <Tabs.Trigger value="list">
            <Tools className="w-4 h-4" />
            List View
          </Tabs.Trigger>
          <Tabs.Trigger value="kanban">
            <SquareTwoStack className="w-4 h-4" />
            Kanban Board
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="list">
          {/* Filters */}
          <div className="bg-ui-bg-subtle p-4 rounded-lg mb-6">
            <Text size="small" weight="plus" className="mb-4">Filters</Text>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <Input
                placeholder="Search orders..."
                value={searchParams.q}
                onChange={(e) =>
                  setSearchParams((prev) => ({ ...prev, q: e.target.value }))
                }
              />
              
              <div className="flex gap-2">
                <Select
                  value={searchParams.status}
                  onValueChange={(value) =>
                    setSearchParams((prev) => ({ ...prev, status: value }))
                  }
                >
                  <Select.Trigger>
                    <Select.Value placeholder="All Statuses" />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="draft">Draft</Select.Item>
                    <Select.Item value="scheduled">Scheduled</Select.Item>
                    <Select.Item value="in_progress">In Progress</Select.Item>
                    <Select.Item value="waiting_parts">Waiting Parts</Select.Item>
                    <Select.Item value="customer_approval">Customer Approval</Select.Item>
                    <Select.Item value="completed">Completed</Select.Item>
                    <Select.Item value="cancelled">Cancelled</Select.Item>
                  </Select.Content>
                </Select>
                {searchParams.status && (
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => setSearchParams((prev) => ({ ...prev, status: "" }))}
                  >
                    Clear
                  </Button>
                )}
              </div>
              
              <div className="flex gap-2">
                <Select
                  value={searchParams.priority}
                  onValueChange={(value) =>
                    setSearchParams((prev) => ({ ...prev, priority: value }))
                  }
                >
                  <Select.Trigger>
                    <Select.Value placeholder="All Priorities" />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="low">Low</Select.Item>
                    <Select.Item value="normal">Normal</Select.Item>
                    <Select.Item value="high">High</Select.Item>
                    <Select.Item value="urgent">Urgent</Select.Item>
                  </Select.Content>
                </Select>
                {searchParams.priority && (
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => setSearchParams((prev) => ({ ...prev, priority: "" }))}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Select
                  value={searchParams.service_type}
                  onValueChange={(value) =>
                    setSearchParams((prev) => ({ ...prev, service_type: value }))
                  }
                >
                  <Select.Trigger>
                    <Select.Value placeholder="All Types" />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="normal">Normal</Select.Item>
                    <Select.Item value="warranty">Warranty</Select.Item>
                    <Select.Item value="setup">Setup</Select.Item>
                    <Select.Item value="emergency">Emergency</Select.Item>
                    <Select.Item value="preventive">Preventive</Select.Item>
                  </Select.Content>
                </Select>
                {searchParams.service_type && (
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => setSearchParams((prev) => ({ ...prev, service_type: "" }))}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Select
                  value={searchParams.customer_id}
                  onValueChange={(value) =>
                    setSearchParams((prev) => ({ ...prev, customer_id: value }))
                  }
                >
                  <Select.Trigger>
                    <Select.Value placeholder="All Customers" />
                  </Select.Trigger>
                  <Select.Content>
                    {customers.map((customer: any) => (
                      <Select.Item key={customer.id} value={customer.id}>
                        {customer.first_name && customer.last_name 
                          ? `${customer.first_name} ${customer.last_name}` 
                          : customer.email}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
                {searchParams.customer_id && (
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => setSearchParams((prev) => ({ ...prev, customer_id: "" }))}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Select
                  value={searchParams.technician_id}
                  onValueChange={(value) =>
                    setSearchParams((prev) => ({ ...prev, technician_id: value }))
                  }
                >
                  <Select.Trigger>
                    <Select.Value placeholder="All Technicians" />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="unassigned">Unassigned</Select.Item>
                    {technicians.map((technician: any) => (
                      <Select.Item key={technician.id} value={technician.id}>
                        {technician.first_name} {technician.last_name}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
                {searchParams.technician_id && (
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => setSearchParams((prev) => ({ ...prev, technician_id: "" }))}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Service Orders Table */}
          <div className="bg-ui-bg-base border border-ui-border-base rounded-lg">
            {isLoading ? (
              <div className="p-8 text-center">
                <Text>Loading service orders...</Text>
              </div>
            ) : !serviceOrders?.service_orders?.length ? (
              <div className="p-8 text-center">
                <Tools className="w-12 h-12 mx-auto mb-4 text-ui-fg-muted" />
                <Heading level="h3" className="mb-2">No service orders yet</Heading>
                <Text className="text-ui-fg-subtle mb-4">
                  Create your first service order to get started
                </Text>
                <Button size="small" variant="secondary" asChild>
                  <Link to="/service-orders/create">
                    <Plus className="w-4 h-4" />
                    Create Service Order
                  </Link>
                </Button>
              </div>
            ) : (
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Service Order</Table.HeaderCell>
                    <Table.HeaderCell>Customer</Table.HeaderCell>
                    <Table.HeaderCell>Technician</Table.HeaderCell>
                    <Table.HeaderCell>Description</Table.HeaderCell>
                    <Table.HeaderCell>Type</Table.HeaderCell>
                    <Table.HeaderCell>Status</Table.HeaderCell>
                    <Table.HeaderCell>Priority</Table.HeaderCell>
                    <Table.HeaderCell>Total Cost</Table.HeaderCell>
                    <Table.HeaderCell>Created</Table.HeaderCell>
                    <Table.HeaderCell></Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {serviceOrders.service_orders.map((serviceOrder: any) => (
                    <Table.Row key={serviceOrder.id}>
                      <Table.Cell>
                        <Link 
                          to={`/service-orders/${serviceOrder.id}`}
                          className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
                        >
                          <Text weight="plus" size="small">
                            {serviceOrder.service_order_number}
                          </Text>
                        </Link>
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="small">
                          {serviceOrder.customer ? (
                            serviceOrder.customer.first_name && serviceOrder.customer.last_name 
                              ? `${serviceOrder.customer.first_name} ${serviceOrder.customer.last_name}`
                              : serviceOrder.customer.email
                          ) : (
                            <Text className="text-ui-fg-muted">No customer</Text>
                          )}
                        </Text>
                        {serviceOrder.customer?.company_name && (
                          <Text size="small" className="text-ui-fg-subtle">
                            {serviceOrder.customer.company_name}
                          </Text>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="small">
                          {serviceOrder.technician ? (
                            `${serviceOrder.technician.first_name} ${serviceOrder.technician.last_name}`
                          ) : (
                            <Text className="text-ui-fg-muted">Unassigned</Text>
                          )}
                        </Text>
                        {serviceOrder.technician?.position && (
                          <Text size="small" className="text-ui-fg-subtle">
                            {serviceOrder.technician.position}
                          </Text>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="small" className="line-clamp-2">
                          {serviceOrder.description}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge size="2xsmall">
                          {serviceTypeLabels[serviceOrder.service_type as keyof typeof serviceTypeLabels] || serviceOrder.service_type}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <StatusBadge color={statusVariants[serviceOrder.status as keyof typeof statusVariants]}>
                          {serviceOrder.status.replace("_", " ")}
                        </StatusBadge>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge color={priorityVariants[serviceOrder.priority as keyof typeof priorityVariants]}>
                          {serviceOrder.priority}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="small">
                          ${serviceOrder.total_cost?.toFixed(2) || '0.00'}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="small" className="text-ui-fg-subtle">
                          {new Date(serviceOrder.created_at).toLocaleDateString()}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <DropdownMenu>
                          <DropdownMenu.Trigger asChild>
                            <IconButton variant="transparent" size="small">
                              <EllipsisHorizontal className="w-4 h-4" />
                            </IconButton>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Content>
                            <DropdownMenu.Item onClick={() => window.location.href = `/service-orders/${serviceOrder.id}`}>
                              <PencilSquare className="w-4 h-4 mr-2" />
                              View
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            )}
          </div>
        </Tabs.Content>

        <Tabs.Content value="kanban">
          <KanbanView
            serviceOrders={serviceOrders?.service_orders || []}
            isLoading={isLoading}
            onRefetch={refetch}
          />
        </Tabs.Content>
      </Tabs>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Service Orders",
  icon: Tools,
})

export default ServiceOrdersList 