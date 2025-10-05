import { Container, Heading, Text } from "@medusajs/ui"
import { InvoiceStatusBadge } from "../common/invoice-status-badge"

interface Invoice {
  id: string
  invoice_number: string
  invoice_date: string
  due_date: string
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
  customer_email: string
  customer_phone?: string
  payment_terms?: string
  currency_code: string
  customer?: {
    first_name?: string
    last_name?: string
    company_name?: string
  }
}

interface InvoiceOverviewWidgetProps {
  data: Invoice
}

const InvoiceOverviewWidget = ({ data: invoice }: InvoiceOverviewWidgetProps) => {
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
          <Heading level="h2">{invoice.invoice_number}</Heading>
          <InvoiceStatusBadge status={invoice.status} />
        </div>
      </div>

      <div className="flex flex-col gap-y-4 px-6 py-4">
        <div className="flex flex-col">
          <Text size="small" weight="plus" className="text-ui-fg-subtle mb-1">
            Invoice Date
          </Text>
          <Text size="small" leading="compact">
            {formatDate(invoice.invoice_date)}
          </Text>
        </div>

        <div className="flex flex-col">
          <Text size="small" weight="plus" className="text-ui-fg-subtle mb-1">
            Due Date
          </Text>
          <Text size="small" leading="compact">
            {formatDate(invoice.due_date)}
          </Text>
        </div>

        <div className="flex flex-col">
          <Text size="small" weight="plus" className="text-ui-fg-subtle mb-1">
            Customer
          </Text>
          {invoice.customer && (invoice.customer.first_name || invoice.customer.last_name) ? (
            <div className="flex flex-col">
              <Text size="small" leading="compact" weight="plus">
                {invoice.customer.company_name || `${invoice.customer.first_name} ${invoice.customer.last_name}`}
              </Text>
              {invoice.customer.company_name && (invoice.customer.first_name || invoice.customer.last_name) && (
                <Text size="small" leading="compact" className="text-ui-fg-subtle">
                  {invoice.customer.first_name} {invoice.customer.last_name}
                </Text>
              )}
              <Text size="small" leading="compact" className="text-ui-fg-subtle">
                {invoice.customer_email}
              </Text>
            </div>
          ) : (
            <Text size="small" leading="compact">{invoice.customer_email}</Text>
          )}
        </div>

        {invoice.payment_terms && (
          <div className="flex flex-col">
            <Text size="small" weight="plus" className="text-ui-fg-subtle mb-1">
              Payment Terms
            </Text>
            <Text size="small" leading="compact">{invoice.payment_terms}</Text>
          </div>
        )}
      </div>
    </Container>
  )
}

export default InvoiceOverviewWidget
