import { Skeleton, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { Container } from "../common/container"
import { Header } from "../common/header"
import { SectionRow } from "../common/section-row"

interface Supplier {
  id: string
  name: string
  contact_person?: string
  email?: string
  phone?: string
}

interface PurchaseOrderSupplierProps {
  data: {
    supplier_id: string
  }
}

export const PurchaseOrderSupplier = ({ data }: PurchaseOrderSupplierProps) => {
  const { data: supplier, isLoading } = useQuery({
    queryKey: ["supplier", data.supplier_id],
    queryFn: async () => {
      const response = await fetch(`/admin/suppliers/${data.supplier_id}`)
      if (!response.ok) throw new Error("Failed to fetch supplier")
      const result = await response.json()
      return result.supplier as Supplier
    },
    enabled: !!data.supplier_id,
  })

  return (
    <Container>
      <Header title="Supplier" />
      <SectionRow
        title="Name"
        value={
          isLoading ? (
            <Skeleton className="h-5 w-48" />
          ) : supplier ? (
            <Link 
              to={`/suppliers/${supplier.id}`}
              className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
            >
              <Text size="small" weight="plus" className="hover:underline">
                {supplier.name}
              </Text>
            </Link>
          ) : (
            "N/A"
          )
        }
      />
      {supplier?.contact_person && (
        <SectionRow title="Contact Person" value={supplier.contact_person} />
      )}
      {supplier?.email && <SectionRow title="Email" value={supplier.email} />}
      {supplier?.phone && <SectionRow title="Phone" value={supplier.phone} />}
    </Container>
  )
}
