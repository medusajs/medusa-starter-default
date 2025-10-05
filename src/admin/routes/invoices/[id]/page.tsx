import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useQuery } from "@tanstack/react-query"
import { useParams } from "react-router-dom"
import { TwoColumnPage } from "../../../components/layout/pages"
import { SingleColumnPageSkeleton } from "../../../components/common/skeleton"
import InvoiceLineItemsWidget from "../../../components/widgets/invoice-line-items-widget"
import InvoiceTotalsWidget from "../../../components/widgets/invoice-totals-widget"
import InvoiceOverviewWidget from "../../../components/widgets/invoice-overview-widget"
import InvoiceActionsWidget from "../../../components/widgets/invoice-actions-widget"
import InvoiceSourceLinkWidget from "../../../components/widgets/invoice-source-link-widget"
import { DocumentText } from "@medusajs/icons"

const InvoiceDetails = () => {
  const { id } = useParams()

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const response = await fetch(`/admin/invoices/${id}`)
      if (!response.ok) throw new Error("Failed to fetch invoice")
      return response.json()
    },
    enabled: !!id,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  })

  if (isLoading || !invoice) {
    return <SingleColumnPageSkeleton sections={3} showJSON showMetadata />
  }

  if (error) {
    throw error
  }

  const inv = invoice.invoice

  return (
    <TwoColumnPage
      widgets={{
        before: [],
        after: [],
        sideAfter: [],
        sideBefore: [],
      }}
      data={inv}
      hasOutlet={false}
      showJSON={false}
      showMetadata={false}
    >
      <TwoColumnPage.Main>
        <InvoiceLineItemsWidget data={inv} />
        <InvoiceTotalsWidget data={inv} />
      </TwoColumnPage.Main>

      <TwoColumnPage.Sidebar>
        <InvoiceOverviewWidget data={inv} />
        <InvoiceActionsWidget data={inv} />
        <InvoiceSourceLinkWidget data={inv} />
      </TwoColumnPage.Sidebar>
    </TwoColumnPage>
  )
}

export default InvoiceDetails

// Loader function to fetch invoice data for breadcrumbs
export const loader = async ({ params }: { params: { id: string } }) => {
  try {
    const response = await fetch(`/admin/invoices/${params.id}`)
    if (!response.ok) throw new Error("Failed to fetch invoice")
    const data = await response.json()
    return data.invoice
  } catch (error) {
    console.error("Error loading invoice:", error)
    return null
  }
}

export const config = defineRouteConfig({
  label: "Invoice Details",
  icon: DocumentText,
})

export const handle = {
  breadcrumb: ({ data }: { data: any }) => {
    if (data && data.invoice_number) {
      return data.invoice_number
    }
    return "Invoice Details"
  },
}
