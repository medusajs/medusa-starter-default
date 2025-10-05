import { Container, Heading, Text } from "@medusajs/ui"
import { formatCurrency } from "../../lib/format-currency"

interface Invoice {
  id: string
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  currency_code: string
}

interface InvoiceTotalsWidgetProps {
  data: Invoice
}

const Cost = ({
  label,
  value,
}: {
  label: string
  value: string
}) => (
  <div className="flex items-center justify-between">
    <Text size="small" leading="compact">
      {label}
    </Text>
    <Text size="small" leading="compact">
      {value}
    </Text>
  </div>
)

const InvoiceTotalsWidget = ({ data: invoice }: InvoiceTotalsWidgetProps) => {
  return (
    <Container className="divide-y divide-dashed p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Totals</Heading>
      </div>

      <div className="text-ui-fg-subtle flex flex-col gap-y-2 px-6 py-4">
        <Cost
          label="Subtotal"
          value={formatCurrency(invoice.subtotal, invoice.currency_code)}
        />

        {invoice.discount_amount > 0 && (
          <Cost
            label="Discount"
            value={`- ${formatCurrency(invoice.discount_amount, invoice.currency_code)}`}
          />
        )}

        <Cost
          label="VAT (21%)"
          value={formatCurrency(invoice.tax_amount, invoice.currency_code)}
        />
      </div>

      <div className="flex flex-col gap-y-2 px-6 py-4">
        <div className="text-ui-fg-base flex items-center justify-between">
          <Text className="text-ui-fg-subtle" size="small" leading="compact">
            Total
          </Text>
          <Text className="text-ui-fg-base" size="small" leading="compact" weight="plus">
            {formatCurrency(invoice.total_amount, invoice.currency_code)}
          </Text>
        </div>
      </div>
    </Container>
  )
}

export default InvoiceTotalsWidget
