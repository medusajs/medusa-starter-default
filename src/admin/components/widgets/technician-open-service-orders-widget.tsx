import { Container, Heading, Text, StatusBadge, Button } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { ArrowUpRightOnBox } from "@medusajs/icons"
import { useCustomTranslation } from "../../hooks/use-custom-translation"

interface ServiceOrder {
  id: string
  service_order_number: string
  description: string
  priority: "low" | "normal" | "high" | "urgent"
  status: string
  customer?: {
    first_name?: string
    last_name?: string
    company_name?: string
  }
  machine?: {
    machine_number?: string
    brand?: string
    model?: string
  }
}

interface TechnicianOpenServiceOrdersWidgetProps {
  data: {
    id: string
    first_name: string
    last_name: string
  }
}

const TechnicianOpenServiceOrdersWidget = ({ data }: TechnicianOpenServiceOrdersWidgetProps) => {
  const { t } = useCustomTranslation()
  
  const { data: serviceOrdersData, isLoading } = useQuery({
    queryKey: ["technician-service-orders", data.id],
    queryFn: async () => {
      const response = await fetch(`/admin/technicians/${data.id}/service-orders?limit=5`)
      if (!response.ok) throw new Error("Failed to fetch service orders")
      return response.json()
    },
    enabled: !!data.id,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  })

  const serviceOrders = serviceOrdersData?.service_orders || []
  const totalCount = serviceOrdersData?.count || 0

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "red"
      case "high": return "orange" 
      case "normal": return "blue"
      case "low": return "grey"
      default: return "grey"
    }
  }

  const truncateText = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  return (
    <Container>
      <div className="px-6 py-4 border-b border-ui-border-base">
        <Heading level="h2">
          Open Service Orders
          {totalCount > 0 && (
            <StatusBadge color="blue" className="ml-2">
              {totalCount}
            </StatusBadge>
          )}
        </Heading>
      </div>
      
      <div className="px-6 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-ui-bg-subtle rounded mb-2"></div>
                <div className="h-3 bg-ui-bg-subtle rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : serviceOrders.length === 0 ? (
          <div className="text-center py-6">
            <Text className="text-ui-fg-subtle">
              No open service orders
            </Text>
          </div>
        ) : (
          <div className="space-y-4">
            {serviceOrders.map((order: ServiceOrder) => (
              <div key={order.id} className="border border-ui-border-base rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Text weight="plus" size="small">
                        {order.service_order_number}
                      </Text>
                      <StatusBadge color={getPriorityColor(order.priority)} size="small">
                        {t(`custom.service_orders.priority.${order.priority}`)}
                      </StatusBadge>
                    </div>
                    <Text size="small" className="text-ui-fg-subtle mb-2">
                      {truncateText(order.description)}
                    </Text>
                    {order.customer && (
                      <Text size="xsmall" className="text-ui-fg-muted">
                        {order.customer.company_name || `${order.customer.first_name} ${order.customer.last_name}`}
                      </Text>
                    )}
                    {order.machine && (
                      <Text size="xsmall" className="text-ui-fg-muted">
                        {order.machine.machine_number} • {order.machine.brand} {order.machine.model}
                      </Text>
                    )}
                  </div>
                  <Button size="small" variant="transparent" asChild>
                    <Link to={`/service-orders/${order.id}`}>
                      <ArrowUpRightOnBox className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
            
            {totalCount > 5 && (
              <div className="pt-2 border-t border-ui-border-base">
                <Button size="small" variant="secondary" asChild className="w-full">
                  <Link to={`/service-orders?technician_id=${data.id}&status=in_progress`}>
                    View All ({totalCount})
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Container>
  )
}

export default TechnicianOpenServiceOrdersWidget