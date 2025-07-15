import { CurrencyDollar, Receipt } from "@medusajs/icons"
import { Container, Heading, Text } from "@medusajs/ui"

type SupplierFinancialSectionProps = {
  supplier: any
}

export const SupplierFinancialSection = ({
  supplier,
}: SupplierFinancialSectionProps) => {
  const hasFinancialInfo = supplier.tax_id || supplier.payment_terms

  if (!hasFinancialInfo) {
    return null
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Financial Information</Heading>
      </div>
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {supplier.tax_id && (
            <div className="flex items-center gap-2">
              <Receipt className="text-ui-fg-subtle" />
              <div className="flex-1">
                <Text size="small" className="text-ui-fg-subtle">
                  Tax ID / VAT Number
                </Text>
                <Text>{supplier.tax_id}</Text>
              </div>
            </div>
          )}
          {supplier.payment_terms && (
            <div className="flex items-center gap-2">
              <CurrencyDollar className="text-ui-fg-subtle" />
              <div className="flex-1">
                <Text size="small" className="text-ui-fg-subtle">
                  Payment Terms
                </Text>
                <Text>{supplier.payment_terms}</Text>
              </div>
            </div>
          )}
        </div>
      </div>
    </Container>
  )
}