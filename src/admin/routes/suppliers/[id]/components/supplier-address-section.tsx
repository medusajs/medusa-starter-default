import { MapPin } from "@medusajs/icons"
import { Container, Heading, Text } from "@medusajs/ui"

type SupplierAddressSectionProps = {
  supplier: any
}

export const SupplierAddressSection = ({
  supplier,
}: SupplierAddressSectionProps) => {
  const hasAddress = supplier.address_line_1 || supplier.city || supplier.country

  if (!hasAddress) {
    return null
  }

  const formatAddress = () => {
    const parts = []
    
    if (supplier.address_line_1) {
      parts.push(supplier.address_line_1)
    }
    
    if (supplier.address_line_2) {
      parts.push(supplier.address_line_2)
    }
    
    const cityStatePostal = [supplier.city, supplier.state, supplier.postal_code]
      .filter(Boolean)
      .join(", ")
    
    if (cityStatePostal) {
      parts.push(cityStatePostal)
    }
    
    if (supplier.country) {
      parts.push(supplier.country)
    }
    
    return parts
  }

  const addressParts = formatAddress()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Address</Heading>
      </div>
      <div className="px-6 py-4">
        <div className="flex items-start gap-2">
          <MapPin className="text-ui-fg-subtle mt-0.5" />
          <div className="flex-1">
            <div className="space-y-1">
              {addressParts.map((part, index) => (
                <Text key={index}>{part}</Text>
              ))}
            </div>
          </div>
        </div>
        
        {/* Detailed breakdown */}
        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-ui-border-base pt-4">
          {supplier.address_line_1 && (
            <div>
              <Text size="small" className="text-ui-fg-subtle">
                Address Line 1
              </Text>
              <Text>{supplier.address_line_1}</Text>
            </div>
          )}
          {supplier.address_line_2 && (
            <div>
              <Text size="small" className="text-ui-fg-subtle">
                Address Line 2
              </Text>
              <Text>{supplier.address_line_2}</Text>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {supplier.city && (
              <div>
                <Text size="small" className="text-ui-fg-subtle">
                  City
                </Text>
                <Text>{supplier.city}</Text>
              </div>
            )}
            {supplier.state && (
              <div>
                <Text size="small" className="text-ui-fg-subtle">
                  State/Province
                </Text>
                <Text>{supplier.state}</Text>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {supplier.postal_code && (
              <div>
                <Text size="small" className="text-ui-fg-subtle">
                  Postal Code
                </Text>
                <Text>{supplier.postal_code}</Text>
              </div>
            )}
            {supplier.country && (
              <div>
                <Text size="small" className="text-ui-fg-subtle">
                  Country
                </Text>
                <Text>{supplier.country}</Text>
              </div>
            )}
          </div>
        </div>
      </div>
    </Container>
  )
}