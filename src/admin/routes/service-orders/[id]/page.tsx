import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowLeft } from "@medusajs/icons"
import { Button, Heading, StatusBadge, Badge, Text, Container } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { TwoColumnPage } from "../../../components/layout/pages"
import { SingleColumnPageSkeleton } from "../../../components/common/skeleton"
import ServiceOrderOverviewWidget from "../../../widgets/service-order-overview"
import ServiceOrderItemsWidget from "../../../widgets/service-order-items"
import ServiceOrderTimeEntriesWidget from "../../../widgets/service-order-time-entries"
import ServiceOrderStatusActionsWidget from "../../../widgets/service-order-status-actions"
import ServiceOrderCommentsWidget from "../../../widgets/service-order-comments"

const ServiceOrderDetails = () => {
  const { id } = useParams()

  const { data: serviceOrder, isLoading, error } = useQuery({
    queryKey: ["service-order", id],
    queryFn: async () => {
      const response = await fetch(`/admin/service-orders/${id}`)
      if (!response.ok) throw new Error("Failed to fetch service order")
      return response.json()
    },
    enabled: !!id,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  })

  if (isLoading || !serviceOrder) {
    return <SingleColumnPageSkeleton sections={3} showJSON showMetadata />
  }

  if (error) {
    throw error
  }

  const so = serviceOrder.service_order

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

  return (
    <div className="flex w-full flex-col gap-y-3">
      {/* Header Section */}
      <Container>
        <div className="flex items-center gap-4 px-6 py-4">
          <Button size="small" variant="transparent" asChild>
            <Link to="/service-orders">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Heading level="h1">{so.service_order_number}</Heading>
              <StatusBadge color={statusVariants[so.status as keyof typeof statusVariants]}>
                {so.status.replace('_', ' ')}
              </StatusBadge>
              <Badge color={priorityVariants[so.priority as keyof typeof priorityVariants]}>
                {so.priority} priority
              </Badge>
            </div>
            <Text className="text-ui-fg-subtle">
              {so.description}
            </Text>
          </div>
        </div>
      </Container>

      {/* Main Content with TwoColumnPage */}
      <TwoColumnPage
        widgets={{
          before: [],
          after: [],
          sideAfter: [],
          sideBefore: [],
        }}
        data={so}
        hasOutlet={false}
        showJSON={false}
        showMetadata={false}
      >
        <TwoColumnPage.Main>
          <ServiceOrderItemsWidget data={so} />
          <ServiceOrderTimeEntriesWidget data={so} />
          <ServiceOrderCommentsWidget data={so} />
        </TwoColumnPage.Main>

        <TwoColumnPage.Sidebar>
          <ServiceOrderOverviewWidget data={so} />
          <ServiceOrderStatusActionsWidget data={so} />
        </TwoColumnPage.Sidebar>
      </TwoColumnPage>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Service Order Details",
})

export default ServiceOrderDetails