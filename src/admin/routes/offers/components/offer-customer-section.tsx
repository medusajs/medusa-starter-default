import { Button, Container, Heading, Text, Badge, Alert } from "@medusajs/ui"
import { User, PencilSquare, ExclamationCircle } from "@medusajs/icons"
import { Link } from "react-router-dom"

interface Address {
  id?: string
  address_1?: string
  address_2?: string
  city?: string
  postal_code?: string
  province?: string
  country_code?: string
}

interface Customer {
  id: string
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  has_account: boolean
  addresses?: Address[]
  billing_address?: Address
  shipping_address?: Address
}

interface OfferCustomerSectionProps {
  customer: Customer | null
  isEditing?: boolean
  onChangeCustomer?: () => void
}

/**
 * Offer Customer Section Component
 *
 * Displays selected customer information or a button to select a customer.
 * Follows Medusa UI patterns for displaying associated resources.
 */
export const OfferCustomerSection = ({
  customer,
  isEditing = false,
  onChangeCustomer,
}: OfferCustomerSectionProps) => {
  if (!customer) {
    return (
      <Container className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Heading level="h2">Customer</Heading>
        </div>

        <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-ui-border-base rounded-lg bg-ui-bg-subtle">
          <User className="text-ui-fg-muted mb-3" />
          <Text weight="plus" className="mb-1">
            No customer selected
          </Text>
          <Text size="small" className="text-ui-fg-subtle mb-4">
            Select a customer to populate offer details
          </Text>
          <Button size="small" variant="secondary" asChild>
            <Link to="/offers/create-customer-selection?return_to=/offers/create">
              Select Customer
            </Link>
          </Button>
        </div>
      </Container>
    )
  }

  const fullName = [customer.first_name, customer.last_name]
    .filter(Boolean)
    .join(" ")

  const hasAddresses = customer.addresses && customer.addresses.length > 0
  const addressCount = customer.addresses?.length || 0
  const primaryAddress = customer.addresses?.[0]

  // Format address for display
  const formatAddress = (address: Address) => {
    const parts = [
      address.address_1,
      address.address_2,
      [address.postal_code, address.city].filter(Boolean).join(" "),
      address.province,
      address.country_code?.toUpperCase(),
    ].filter(Boolean)
    return parts.join(", ")
  }

  return (
    <Container className="p-6">
      <div className="flex items-center justify-between mb-4">
        <Heading level="h2">Customer</Heading>
        {isEditing && onChangeCustomer && (
          <Button
            size="small"
            variant="secondary"
            onClick={onChangeCustomer}
          >
            <PencilSquare className="mr-2" />
            Change Customer
          </Button>
        )}
      </div>

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {fullName && (
              <Text weight="plus" size="large">
                {fullName}
              </Text>
            )}
            {customer.has_account && (
              <Badge size="2xsmall" color="green">
                Registered
              </Badge>
            )}
          </div>
          <Text size="small" className="text-ui-fg-subtle">
            {customer.email}
          </Text>
          {customer.phone && (
            <Text size="small" className="text-ui-fg-subtle">
              {customer.phone}
            </Text>
          )}

          {/* Display primary address */}
          {hasAddresses && primaryAddress && (
            <div className="mt-3 pt-3 border-t border-ui-border-base">
              <div className="flex items-center gap-2 mb-1">
                <Text size="small" weight="plus" className="text-ui-fg-base">
                  Billing Address
                </Text>
                {addressCount > 1 && (
                  <Badge size="2xsmall">
                    +{addressCount - 1} more
                  </Badge>
                )}
              </div>
              <Text size="small" className="text-ui-fg-subtle">
                {formatAddress(primaryAddress)}
              </Text>
            </div>
          )}
        </div>
        <Button size="small" variant="transparent" asChild>
          <Link to={`/customers/${customer.id}`} target="_blank">
            View Customer
          </Link>
        </Button>
      </div>

      {/* Warning if customer has no addresses */}
      {!hasAddresses && (
        <Alert className="mt-4" variant="warning">
          <div className="flex items-start gap-2">
            <ExclamationCircle className="text-ui-fg-warning" />
            <div>
              <Text weight="plus" size="small">No addresses found</Text>
              <Text size="small" className="text-ui-fg-subtle mt-1">
                This customer needs at least one address to create an offer.{" "}
                <Link
                  to={`/customers/${customer.id}`}
                  target="_blank"
                  className="text-ui-fg-interactive hover:underline"
                >
                  Add an address
                </Link>
              </Text>
            </div>
          </div>
        </Alert>
      )}
    </Container>
  )
}
