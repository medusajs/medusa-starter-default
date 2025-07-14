import { Container, Heading, Text, Button, Badge } from "@medusajs/ui"
import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { EditSupplierForm } from "../../../components/edit-supplier-form"
import { SupplierActions } from "../../../components/supplier-actions"

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

  if (isLoading) {
    return (
      <Container>
        <Text>Loading...</Text>
      </Container>
    )
  }

  if (error) {
    return (
      <Container>
        <Text>Error loading supplier: {error.message}</Text>
      </Container>
    )
  }

  if (!supplier) {
    return (
      <Container>
        <Text>Supplier not found</Text>
      </Container>
    )
  }

  return (
    <Container>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Heading level="h1">{supplier.name}</Heading>
          {supplier.code && (
            <Text size="small" className="text-ui-fg-subtle">
              Code: {supplier.code}
            </Text>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge color={supplier.is_active ? "green" : "red"}>
            {supplier.is_active ? "Active" : "Inactive"}
          </Badge>
          <SupplierActions supplier={supplier} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="border border-ui-border-base rounded-lg p-6">
          <Heading level="h3" className="mb-4">Basic Information</Heading>
          <div className="space-y-3">
            {supplier.email && (
              <div>
                <Text size="small" className="text-ui-fg-subtle">Email</Text>
                <Text>{supplier.email}</Text>
              </div>
            )}
            {supplier.phone && (
              <div>
                <Text size="small" className="text-ui-fg-subtle">Phone</Text>
                <Text>{supplier.phone}</Text>
              </div>
            )}
            {supplier.website && (
              <div>
                <Text size="small" className="text-ui-fg-subtle">Website</Text>
                <Text>{supplier.website}</Text>
              </div>
            )}
            {supplier.contact_person && (
              <div>
                <Text size="small" className="text-ui-fg-subtle">Contact Person</Text>
                <Text>{supplier.contact_person}</Text>
              </div>
            )}
            {supplier.currency_code && (
              <div>
                <Text size="small" className="text-ui-fg-subtle">Currency</Text>
                <Text>{supplier.currency_code}</Text>
              </div>
            )}
          </div>
        </div>

        {/* Address Information */}
        {(supplier.address_line_1 || supplier.city || supplier.country) && (
          <div className="border border-ui-border-base rounded-lg p-6">
            <Heading level="h3" className="mb-4">Address</Heading>
            <div className="space-y-3">
              {supplier.address_line_1 && (
                <div>
                  <Text size="small" className="text-ui-fg-subtle">Address</Text>
                  <Text>{supplier.address_line_1}</Text>
                  {supplier.address_line_2 && <Text>{supplier.address_line_2}</Text>}
                </div>
              )}
              {supplier.city && (
                <div>
                  <Text size="small" className="text-ui-fg-subtle">City</Text>
                  <Text>{supplier.city}</Text>
                </div>
              )}
              {supplier.state && (
                <div>
                  <Text size="small" className="text-ui-fg-subtle">State/Province</Text>
                  <Text>{supplier.state}</Text>
                </div>
              )}
              {supplier.postal_code && (
                <div>
                  <Text size="small" className="text-ui-fg-subtle">Postal Code</Text>
                  <Text>{supplier.postal_code}</Text>
                </div>
              )}
              {supplier.country && (
                <div>
                  <Text size="small" className="text-ui-fg-subtle">Country</Text>
                  <Text>{supplier.country}</Text>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Financial Information */}
        {(supplier.tax_id || supplier.payment_terms) && (
          <div className="border border-ui-border-base rounded-lg p-6">
            <Heading level="h3" className="mb-4">Financial Information</Heading>
            <div className="space-y-3">
              {supplier.tax_id && (
                <div>
                  <Text size="small" className="text-ui-fg-subtle">Tax ID / VAT Number</Text>
                  <Text>{supplier.tax_id}</Text>
                </div>
              )}
              {supplier.payment_terms && (
                <div>
                  <Text size="small" className="text-ui-fg-subtle">Payment Terms</Text>
                  <Text>{supplier.payment_terms}</Text>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Additional Information */}
        {supplier.notes && (
          <div className="border border-ui-border-base rounded-lg p-6">
            <Heading level="h3" className="mb-4">Notes</Heading>
            <Text>{supplier.notes}</Text>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-2">
        <Button variant="secondary" asChild>
          <Link to="/app/suppliers">Back to Suppliers</Link>
        </Button>
        <Button variant="primary" asChild>
          <Link to={`/app/suppliers/${supplier.id}/edit`}>
            Edit Supplier
          </Link>
        </Button>
        <Button asChild>
          <Link to={`/app/purchase-orders?supplier_id=${supplier.id}`}>
            View Purchase Orders
          </Link>
        </Button>
      </div>
    </Container>
  )
}

export default SupplierDetailPage

export const config = defineRouteConfig({}) 