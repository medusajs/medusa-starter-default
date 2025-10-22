import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useQuery } from "@tanstack/react-query"
import { useParams } from "react-router-dom"
import { TwoColumnPage } from "../../../components/layout/pages/two-column-page"
import { SingleColumnPageSkeleton } from "../../../components/common/skeleton"
import { PurchaseOrderSummary } from "../../../components/widgets/purchase-order-summary"
import { PurchaseOrderItems } from "../../../components/widgets/purchase-order-items"
import { PurchaseOrderSupplier } from "../../../components/widgets/purchase-order-supplier"
import { PurchaseOrderTotals } from "../../../components/widgets/purchase-order-totals"

const usePurchaseOrder = (id: string) => {
  return useQuery({
    queryKey: ["purchase-order", id],
    queryFn: async () => {
      const response = await fetch(`/admin/purchase-orders/${id}`)
      if (!response.ok) {
        throw new Error("Failed to fetch purchase order")
      }
      const data = await response.json()
      return data.purchase_order
    },
    enabled: !!id,
  })
}

const PurchaseOrderDetailPage = () => {
  const { id } = useParams()
  const { data: purchaseOrder, isLoading, error } = usePurchaseOrder(id!)

  if (isLoading || !purchaseOrder) {
    return <SingleColumnPageSkeleton sections={3} showJSON={false} showMetadata={false} />
  }

  if (error) {
    throw error
  }

  return (
    <>
      <PurchaseOrderSummary data={purchaseOrder} />
      <TwoColumnPage
        widgets={{
          before: [],
          after: [],
          sideAfter: [],
          sideBefore: [],
        }}
        data={purchaseOrder}
        hasOutlet={false}
        showJSON={false}
        showMetadata={false}
      >
        <TwoColumnPage.Main>
          <PurchaseOrderItems data={purchaseOrder} />
        </TwoColumnPage.Main>

        <TwoColumnPage.Sidebar>
          <PurchaseOrderSupplier data={purchaseOrder} />
          <PurchaseOrderTotals data={purchaseOrder} />
        </TwoColumnPage.Sidebar>
      </TwoColumnPage>
    </>
  )
}

export default PurchaseOrderDetailPage

export const config = defineRouteConfig({
  label: "Purchase Order Details",
})

// Breadcrumb configuration
export const handle = {
  breadcrumb: ({ data }: { data: any }) => {
    if (data && data.po_number) {
      return data.po_number
    }
    return "Purchase Order Details"
  },
}

// Loader function for breadcrumbs
export const loader = async ({ params }: { params: { id: string } }) => {
  try {
    const response = await fetch(`/admin/purchase-orders/${params.id}`)
    if (!response.ok) throw new Error("Failed to fetch purchase order")
    const data = await response.json()
    return data.purchase_order
  } catch (error) {
    console.error("Error loading purchase order:", error)
    return null
  }
}
