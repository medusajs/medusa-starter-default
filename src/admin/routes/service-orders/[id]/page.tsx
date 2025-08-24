import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useQuery } from "@tanstack/react-query"
import { useParams } from "react-router-dom"
import { TwoColumnPage } from "../../../components/layout/pages"
import { SingleColumnPageSkeleton } from "../../../components/common/skeleton"
import ServiceOrderOverviewWidget from "../../../components/widgets/service-order-overview"
import ServiceOrderItemsWidget from "../../../components/widgets/service-order-items"
import ServiceOrderTimeEntriesWidget from "../../../components/widgets/service-order-time-entries"
import ServiceOrderCommentsWidget from "../../../components/widgets/service-order-comments"
import ServiceOrderCharacteristicsWidget from "../../../components/widgets/service-order-characteristics"

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

export default ServiceOrderDetails

// Loader function to fetch service order data for breadcrumbs
export const loader = async ({ params }: { params: { id: string } }) => {
  try {
    const response = await fetch(`/admin/service-orders/${params.id}`)
    if (!response.ok) throw new Error("Failed to fetch service order")
    const data = await response.json()
    return data.service_order
  } catch (error) {
    console.error("Error loading service order:", error)
    return null
  }
}

export const config = defineRouteConfig({
  label: "Service Order Details",
})

// Breadcrumb configuration
export const handle = {
  breadcrumb: ({ data }: { data: any }) => {
    if (data && data.service_order_number) {
      return data.service_order_number
    }
    return "Service Order Details"
  },
}