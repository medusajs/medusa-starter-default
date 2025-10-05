import { Container, Heading, Button, Text } from "@medusajs/ui"
import { ArrowUpRightOnBox } from "@medusajs/icons"
import { useNavigate } from "react-router-dom"

interface Invoice {
  id: string
  order_id?: string
  service_order_id?: string
  notes?: string
}

interface InvoiceSourceLinkWidgetProps {
  data: Invoice
}

const InvoiceSourceLinkWidget = ({ data: invoice }: InvoiceSourceLinkWidgetProps) => {
  const navigate = useNavigate()

  const hasSource = invoice.order_id || invoice.service_order_id
  const hasNotes = invoice.notes && invoice.notes.trim().length > 0

  if (!hasSource && !hasNotes) {
    return null
  }

  const handleNavigate = () => {
    if (invoice.order_id) {
      navigate(`/orders/${invoice.order_id}`)
    } else if (invoice.service_order_id) {
      navigate(`/service-orders/${invoice.service_order_id}`)
    }
  }

  return (
    <Container className="divide-y divide-dashed p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Related Information</Heading>
      </div>

      <div className="flex flex-col gap-y-4 px-6 py-4">
        {hasSource && (
          <div className="flex flex-col">
            <Text size="small" weight="plus" className="text-ui-fg-subtle mb-2">
              Source
            </Text>
            <Button
              variant="secondary"
              size="small"
              onClick={handleNavigate}
            >
              <ArrowUpRightOnBox />
              {invoice.order_id ? 'View Order' : 'View Service Order'}
            </Button>
          </div>
        )}

        {hasNotes && (
          <div className="flex flex-col">
            <Text size="small" weight="plus" className="text-ui-fg-subtle mb-2">
              Notes
            </Text>
            <Text size="small" leading="compact" className="whitespace-pre-wrap">
              {invoice.notes}
            </Text>
          </div>
        )}
      </div>
    </Container>
  )
}

export default InvoiceSourceLinkWidget
