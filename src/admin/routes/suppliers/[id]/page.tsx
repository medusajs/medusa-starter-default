import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { SupplierGeneralSection } from "./components/supplier-general-section"
import { SupplierContactSection } from "./components/supplier-contact-section"
import { SupplierAddressSection } from "./components/supplier-address-section"
import { SupplierFinancialSection } from "./components/supplier-financial-section"
import { SingleColumnPageSkeleton } from "../../../components/common/skeleton"
import { SupplierPriceLists } from "../../../components/supplier-price-lists"

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
    <div className="flex flex-col gap-y-2">
      <SupplierGeneralSection supplier={supplier} />
      <SupplierContactSection supplier={supplier} />
      <SupplierAddressSection supplier={supplier} />
      <SupplierFinancialSection supplier={supplier} />
      <SupplierPriceLists data={supplier} />
    </div>
  )
}

export default SupplierDetailPage

export const config = defineRouteConfig({}) 