import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Clock, Package, Wrench, TrendingUp } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  StatusBadge,
  Text,
  Table,
} from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"

const ServiceOrdersOverviewWidget = () => {
  const { data: serviceOrders, isLoading } = useQuery({
    queryKey: ["service-orders-overview"],
    queryFn: async () => {
      const response = await fetch("/admin/service-orders?limit=5&offset=0")
      if (!response.ok) throw new Error("Failed to fetch service orders")
      return response.json()
    },
  })

  const { data: stats } = useQuery({
    queryKey: ["service-orders-stats"],
    queryFn: async () => {
      // Fetch basic stats (you could enhance this with dedicated endpoints)
      const [draftRes, inProgressRes, completedRes] = await Promise.all([
        fetch("/admin/service-orders?status=draft&limit=0"),
        fetch("/admin/service-orders?status=in_progress&limit=0"),
        fetch("/admin/service-orders?status=completed&limit=0"),
      ])
      
      const [draft, inProgress, completed] = await Promise.all([
        draftRes.json(),
        inProgressRes.json(),
        completedRes.json(),
      ])

      return {
        draft: draft.count || 0,
        inProgress: inProgress.count || 0,
        completed: completed.count || 0,
      }
    },
  })

  const statusVariants = {
    draft: "orange",
    scheduled: "blue",
    in_progress: "purple",
    waiting_parts: "yellow",
    customer_approval: "orange",
    completed: "green",
    cancelled: "red",
  } as const

  if (isLoading) {
    return (
      <Container>
        <Text>Loading service orders...</Text>
      </Container>
    )
  }

  return (
    <Container>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Heading level="h2">Service Orders</Heading>
            <Text className="text-ui-fg-subtle">
              Recent repair and maintenance work orders
            </Text>
          </div>
          <Button size="small" variant="secondary" asChild>
            <Link to="/service-orders">
              View All
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-ui-bg-subtle p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <Text size="small" className="text-ui-fg-subtle">Draft Orders</Text>
                  <Heading level="h3">{stats.draft}</Heading>
                </div>
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-ui-bg-subtle p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <Text size="small" className="text-ui-fg-subtle">In Progress</Text>
                  <Heading level="h3">{stats.inProgress}</Heading>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-ui-bg-subtle p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <Text size="small" className="text-ui-fg-subtle">Completed</Text>
                  <Heading level="h3">{stats.completed}</Heading>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Service Orders */}
        <div>
          <Heading level="h3" className="mb-4">Recent Service Orders</Heading>
          {!serviceOrders?.service_orders?.length ? (
            <div className="text-center py-8 bg-ui-bg-subtle rounded-lg">
              <Wrench className="w-12 h-12 mx-auto mb-4 text-ui-fg-muted" />
              <Heading level="h4" className="mb-2">No service orders yet</Heading>
              <Text className="text-ui-fg-subtle mb-4">
                Create your first service order to get started
              </Text>
              <Button size="small" variant="secondary" asChild>
                <Link to="/service-orders/create">
                  Create Service Order
                </Link>
              </Button>
            </div>
          ) : (
            <div className="bg-ui-bg-base border border-ui-border-base rounded-lg">
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Service Order</Table.HeaderCell>
                    <Table.HeaderCell>Description</Table.HeaderCell>
                    <Table.HeaderCell>Status</Table.HeaderCell>
                    <Table.HeaderCell>Priority</Table.HeaderCell>
                    <Table.HeaderCell>Total Cost</Table.HeaderCell>
                    <Table.HeaderCell>Created</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {serviceOrders.service_orders.slice(0, 5).map((serviceOrder: any) => (
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
                        <Text size="small" className="line-clamp-1">
                          {serviceOrder.description}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <StatusBadge color={statusVariants[serviceOrder.status as keyof typeof statusVariants]}>
                          {serviceOrder.status.replace('_', ' ')}
                        </StatusBadge>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge size="2xsmall">
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
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
          )}
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "home.stats.after",
})

export default ServiceOrdersOverviewWidget 