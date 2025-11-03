import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useQuery } from "@tanstack/react-query"
import { useParams } from "react-router-dom"
import { useState } from "react"
import { SingleColumnPageSkeleton } from "../../../components/common/skeleton"
import { PurchaseOrderHeader } from "../../../components/widgets/purchase-order-header"
import { PurchaseOrderGeneral } from "../../../components/widgets/purchase-order-general"
import { PurchaseOrderTimeline } from "../../../components/widgets/purchase-order-timeline"
import { PurchaseOrderItems } from "../../../components/widgets/purchase-order-items"
import { DeliveryHistory } from "../../../components/widgets/delivery-history"
import { BackordersWidget } from "../../../components/widgets/backorders-widget"
import { PurchaseOrderSupplier } from "../../../components/widgets/purchase-order-supplier"
import { PurchaseOrderTotals } from "../../../components/widgets/purchase-order-totals"
import { DeliveryImportModal } from "../../../components/modals/delivery-import-modal"

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
  const [showDeliveryImport, setShowDeliveryImport] = useState(false)

  if (isLoading || !purchaseOrder) {
    return <SingleColumnPageSkeleton sections={3} showJSON={false} showMetadata={false} />
  }

  if (error) {
    throw error
  }

  const isReceivable = ["confirmed", "partially_received", "received"].includes(
    purchaseOrder.status
  )

  return (
    <div className="flex flex-col gap-y-3">
      {/* Header with actions */}
      <PurchaseOrderHeader
        data={purchaseOrder}
        onImportDelivery={isReceivable ? () => setShowDeliveryImport(true) : undefined}
      />

      {/* Two-column layout */}
      <div className="flex flex-col gap-x-4 gap-y-3 xl:flex-row xl:items-start">
        {/* Main content */}
        <div className="flex w-full flex-col gap-y-3">
          {/* General info */}
          <PurchaseOrderGeneral data={purchaseOrder} />

          {/* Backorders Alert (only show if backorders exist) */}
          <BackordersWidget
            purchaseOrderId={purchaseOrder.id}
            purchaseOrderNumber={purchaseOrder.po_number}
          />

          {/* Items */}
          <PurchaseOrderItems data={purchaseOrder} />

          {/* Delivery History */}
          <DeliveryHistory purchaseOrderId={purchaseOrder.id} />
        </div>

        {/* Sidebar */}
        <div className="flex w-full max-w-[100%] flex-col gap-y-3 xl:mt-0 xl:max-w-[440px]">
          <PurchaseOrderTimeline data={purchaseOrder} />
          <PurchaseOrderSupplier data={purchaseOrder} />
          <PurchaseOrderTotals data={purchaseOrder} />
        </div>
      </div>

      {/* Delivery Import Modal */}
      <DeliveryImportModal
        open={showDeliveryImport}
        onOpenChange={setShowDeliveryImport}
        purchaseOrderId={purchaseOrder.id}
      />
    </div>
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
