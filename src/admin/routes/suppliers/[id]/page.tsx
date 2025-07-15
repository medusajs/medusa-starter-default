import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { SupplierGeneralSection } from "./components/supplier-general-section"
import { SupplierContactSection } from "./components/supplier-contact-section"
import { SupplierFinancialSection } from "./components/supplier-financial-section"
import { SupplierAddressSection } from "./components/supplier-address-section"
import SupplierPriceListsWidget from "../../../components/supplier-price-lists"
import { TwoColumnPage } from "../../../components/layout/pages"
import { SingleColumnPageSkeleton } from "../../../components/common/skeleton"

const SupplierDetailPage = () => {
  const { id } = useParams()

  const { data: supplier, isLoading, error } = useQuery({
    queryKey: ["supplier", id],
    queryFn: async () => {
      const response = await fetch(`/admin/suppliers/${id}`)
      if (!response.ok) {
        throw new Error("Failed to fetch supplier")
      }
      const data = await response.json()
      return data.supplier
    },
  })

  if (isLoading || !supplier) {
    return <SingleColumnPageSkeleton sections={3} showJSON showMetadata />
  }

  if (error) {
    throw error
  }

  return (
    <TwoColumnPage
      widgets={{
        before: [],
        after: [],
        sideAfter: [],
        sideBefore: [],
      }}
      data={supplier}
      hasOutlet
      showJSON
      showMetadata
    >
      <TwoColumnPage.Main>
        <SupplierGeneralSection supplier={supplier} />
        <SupplierContactSection supplier={supplier} />
        <SupplierFinancialSection supplier={supplier} />
        <SupplierPriceListsWidget data={supplier} />
      </TwoColumnPage.Main>
      <TwoColumnPage.Sidebar>
        <SupplierAddressSection supplier={supplier} />
      </TwoColumnPage.Sidebar>
    </TwoColumnPage>
  )
}

export default SupplierDetailPage

export const config = defineRouteConfig({}) 