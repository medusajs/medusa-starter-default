import { Container, Heading, Text } from "@medusajs/ui"
import { formatCurrency } from "../../lib/format-currency"

interface Offer {
  id: string
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  currency_code: string
}

interface OfferTotalsWidgetProps {
  data: Offer
}

/**
 * Cost line item component
 * Displays a label-value pair for financial data
 */
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

/**
 * Offer Totals Widget
 * Displays financial summary of the offer
 * Following the pattern from InvoiceTotalsWidget
 */
const OfferTotalsWidget = ({ data: offer }: OfferTotalsWidgetProps) => {
  return (
    <Container className="divide-y divide-dashed p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Totals</Heading>
      </div>

      <div className="text-ui-fg-subtle flex flex-col gap-y-2 px-6 py-4">
        <Cost
          label="Subtotal"
          value={formatCurrency(offer.subtotal, offer.currency_code)}
        />

        {offer.discount_amount > 0 && (
          <Cost
            label="Discount"
            value={`- ${formatCurrency(offer.discount_amount, offer.currency_code)}`}
          />
        )}

        <Cost
          label="VAT (21%)"
          value={formatCurrency(offer.tax_amount, offer.currency_code)}
        />
      </div>

      <div className="flex flex-col gap-y-2 px-6 py-4">
        <div className="text-ui-fg-base flex items-center justify-between">
          <Text className="text-ui-fg-subtle" size="small" leading="compact">
            Total
          </Text>
          <Text className="text-ui-fg-base" size="small" leading="compact" weight="plus">
            {formatCurrency(offer.total_amount, offer.currency_code)}
          </Text>
        </div>
      </div>
    </Container>
  )
}

export default OfferTotalsWidget

