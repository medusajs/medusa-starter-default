import { useParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading } from "@medusajs/ui"
import { SupplierPricingSettingsSection } from "../components/supplier-pricing-settings-section"
import { SupplierParserConfigSection } from "../components/supplier-parser-config-section"
import { SupplierDiscountConfigSection } from "../components/supplier-discount-config-section"
import { SupplierBrandsSection } from "../components/supplier-brands-section"
import { SingleColumnPageSkeleton } from "../../../../components/common/skeleton"

const SupplierSettingsPage = () => {
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
      <Container className="p-6">
        <Heading level="h1">Supplier Configuration</Heading>
      </Container>
      
      <SupplierPricingSettingsSection supplier={supplier} />
      <SupplierDiscountConfigSection supplier={supplier} />
      <SupplierParserConfigSection supplierId={supplier.id} />
      <SupplierBrandsSection supplierId={supplier.id} />
    </div>
  )
}

export default SupplierSettingsPage

// Loader function to fetch supplier data for breadcrumbs
export const loader = async ({ params }: { params: { id: string } }) => {
  try {
    const response = await fetch(`/admin/suppliers/${params.id}`)
    if (!response.ok) throw new Error("Failed to fetch supplier")
    const data = await response.json()
    return data.supplier
  } catch (error) {
    console.error("Error loading supplier:", error)
    return null
  }
}

export const config = defineRouteConfig({
  label: "Configuration",
})

// Breadcrumb configuration
export const handle = {
  breadcrumb: () => "Configuration",
}


