import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useQuery } from "@tanstack/react-query"
import { useParams } from "react-router-dom"
import { TwoColumnPage } from "../../../components/layout/pages"
import { SingleColumnPageSkeleton } from "../../../components/common/skeleton"
import OfferLineItemsWidget from "../../../components/widgets/offer-line-items-widget"
import OfferTotalsWidget from "../../../components/widgets/offer-totals-widget"
import OfferOverviewWidget from "../../../components/widgets/offer-overview-widget"
import OfferActionsWidget from "../../../components/widgets/offer-actions-widget"
import { DocumentText } from "@medusajs/icons"

/**
 * Offer Detail Page
 * Displays complete offer information with line items and actions
 * Following the pattern from InvoiceDetails (src/admin/routes/invoices/[id]/page.tsx)
 */
const OfferDetails = () => {
  const { id } = useParams()

  const { data: offer, isLoading, error } = useQuery({
    queryKey: ["offer", id],
    queryFn: async () => {
      const response = await fetch(`/admin/offers/${id}`)
      if (!response.ok) throw new Error("Failed to fetch offer")
      return response.json()
    },
    enabled: !!id,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  })

  if (isLoading || !offer) {
    return <SingleColumnPageSkeleton sections={3} showJSON showMetadata />
  }

  if (error) {
    throw error
  }

  const offerData = offer.offer

  return (
    <TwoColumnPage
      widgets={{
        before: [],
        after: [],
        sideAfter: [],
        sideBefore: [],
      }}
      data={offerData}
      hasOutlet={false}
      showJSON={false}
      showMetadata={false}
    >
      <TwoColumnPage.Main>
        <OfferLineItemsWidget data={offerData} />
        <OfferTotalsWidget data={offerData} />
      </TwoColumnPage.Main>

      <TwoColumnPage.Sidebar>
        <OfferOverviewWidget data={offerData} />
        <OfferActionsWidget data={offerData} />
      </TwoColumnPage.Sidebar>
    </TwoColumnPage>
  )
}

export default OfferDetails

// Loader function to fetch offer data for breadcrumbs
export const loader = async ({ params }: { params: { id: string } }) => {
  try {
    const response = await fetch(`/admin/offers/${params.id}`)
    if (!response.ok) throw new Error("Failed to fetch offer")
    const data = await response.json()
    return data.offer
  } catch (error) {
    console.error("Error loading offer:", error)
    return null
  }
}

export const config = defineRouteConfig({
  label: "Offer Details",
  icon: DocumentText,
})

export const handle = {
  breadcrumb: ({ data }: { data: any }) => {
    if (data && data.offer_number) {
      return data.offer_number
    }
    return "Offer Details"
  },
}

