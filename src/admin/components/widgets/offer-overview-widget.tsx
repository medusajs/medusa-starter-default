import { Container, Heading, Text } from "@medusajs/ui"
import { OfferStatusBadge } from "../common/offer-status-badge"

interface Offer {
  id: string
  offer_number: string
  offer_date: string
  valid_until: string
  status: "draft" | "sent" | "accepted" | "rejected" | "expired" | "converted"
  customer_id: string
  customer_email: string
  customer_phone?: string
  currency_code: string
  notes?: string
}

interface OfferOverviewWidgetProps {
  data: Offer
}

/**
 * Offer Overview Widget
 * Displays key offer information in the sidebar
 * Following the pattern from InvoiceOverviewWidget
 */
const OfferOverviewWidget = ({ data: offer }: OfferOverviewWidgetProps) => {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('nl-BE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <Container className="divide-y divide-dashed p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-x-2">
          <Heading level="h2">{offer.offer_number}</Heading>
          <OfferStatusBadge status={offer.status} />
        </div>
      </div>

      <div className="flex flex-col gap-y-4 px-6 py-4">
        <div className="flex flex-col">
          <Text size="small" weight="plus" className="text-ui-fg-subtle mb-1">
            Offer Date
          </Text>
          <Text size="small" leading="compact">
            {formatDate(offer.offer_date)}
          </Text>
        </div>

        <div className="flex flex-col">
          <Text size="small" weight="plus" className="text-ui-fg-subtle mb-1">
            Valid Until
          </Text>
          <Text size="small" leading="compact">
            {formatDate(offer.valid_until)}
          </Text>
        </div>

        <div className="flex flex-col">
          <Text size="small" weight="plus" className="text-ui-fg-subtle mb-1">
            Customer
          </Text>
          <div className="flex flex-col">
            <Text size="small" leading="compact" weight="plus">
              {offer.customer_email}
            </Text>
            {offer.customer_phone && (
              <Text size="small" leading="compact" className="text-ui-fg-subtle">
                {offer.customer_phone}
              </Text>
            )}
          </div>
        </div>

        {offer.notes && (
          <div className="flex flex-col">
            <Text size="small" weight="plus" className="text-ui-fg-subtle mb-1">
              Notes
            </Text>
            <Text size="small" leading="compact">{offer.notes}</Text>
          </div>
        )}
      </div>
    </Container>
  )
}

export default OfferOverviewWidget

