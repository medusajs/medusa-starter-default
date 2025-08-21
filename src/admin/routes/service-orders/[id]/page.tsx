import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useQuery } from "@tanstack/react-query"
import { useParams } from "react-router-dom"
import { TwoColumnPage } from "../../../components/layout/pages"
import { SingleColumnPageSkeleton } from "../../../components/common/skeleton"
import ServiceOrderOverviewWidget from "../../../widgets/service-order-overview"
import ServiceOrderItemsWidget from "../../../widgets/service-order-items"
import ServiceOrderTimeEntriesWidget from "../../../widgets/service-order-time-entries"
import ServiceOrderCommentsWidget from "../../../widgets/service-order-comments"
import ServiceOrderCharacteristicsWidget from "../../../widgets/service-order-characteristics"

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

  return (
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
        <ServiceOrderCharacteristicsWidget data={so} />
      </TwoColumnPage.Sidebar>
    </TwoColumnPage>
  )
}

export const config = defineRouteConfig({
  label: "Service Order Details",
})

export default ServiceOrderDetails