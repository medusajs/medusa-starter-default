import { AtSymbol, Phone, GlobeEurope, User } from "@medusajs/icons"
import { Container, Heading, Text } from "@medusajs/ui"

type SupplierContactSectionProps = {
  supplier: any
}

export const SupplierContactSection = ({
  supplier,
}: SupplierContactSectionProps) => {
  const hasContactInfo = supplier.email || supplier.phone || supplier.website || supplier.contact_person

  if (!hasContactInfo) {
    return null
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Contact Information</Heading>
      </div>
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {supplier.email && (
            <div className="flex items-center gap-2">
              <AtSymbol className="text-ui-fg-subtle" />
              <div className="flex-1">
                <Text size="small" className="text-ui-fg-subtle">
                  Email
                </Text>
                <Text>{supplier.email}</Text>
              </div>
            </div>
          )}
          {supplier.phone && (
            <div className="flex items-center gap-2">
              <Phone className="text-ui-fg-subtle" />
              <div className="flex-1">
                <Text size="small" className="text-ui-fg-subtle">
                  Phone
                </Text>
                <Text>{supplier.phone}</Text>
              </div>
            </div>
          )}
          {supplier.website && (
            <div className="flex items-center gap-2">
              <GlobeEurope className="text-ui-fg-subtle" />
              <div className="flex-1">
                <Text size="small" className="text-ui-fg-subtle">
                  Website
                </Text>
                <Text>
                  <a
                    href={supplier.website.startsWith('http') ? supplier.website : `https://${supplier.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
                  >
                    {supplier.website}
                  </a>
                </Text>
              </div>
            </div>
          )}
          {supplier.contact_person && (
            <div className="flex items-center gap-2">
              <User className="text-ui-fg-subtle" />
              <div className="flex-1">
                <Text size="small" className="text-ui-fg-subtle">
                  Contact Person
                </Text>
                <Text>{supplier.contact_person}</Text>
              </div>
            </div>
          )}
        </div>
      </div>
    </Container>
  )
}