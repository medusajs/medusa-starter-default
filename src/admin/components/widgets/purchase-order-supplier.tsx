import { Container, Heading, Text, Label, Skeleton, Button } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"

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
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Supplier</Heading>
        {supplier && (
          <Button variant="secondary" size="small" asChild>
            <Link to={`/suppliers/${supplier.id}`}>View Details</Link>
          </Button>
        )}
      </div>
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label size="small" weight="plus" className="mb-2">
              Name
            </Label>
            {isLoading ? (
              <Skeleton className="h-5 w-48" />
            ) : (
              <Text size="small" className="font-medium">
                {supplier?.name || 'N/A'}
              </Text>
            )}
          </div>
          {supplier?.contact_person && (
            <div>
              <Label size="small" weight="plus" className="mb-2">
                Contact Person
              </Label>
              <Text size="small">{supplier.contact_person}</Text>
            </div>
          )}
          {supplier?.email && (
            <div>
              <Label size="small" weight="plus" className="mb-2">
                Email
              </Label>
              <Text size="small">{supplier.email}</Text>
            </div>
          )}
          {supplier?.phone && (
            <div>
              <Label size="small" weight="plus" className="mb-2">
                Phone
              </Label>
              <Text size="small">{supplier.phone}</Text>
            </div>
          )}
        </div>
      </div>
    </Container>
  )
}
