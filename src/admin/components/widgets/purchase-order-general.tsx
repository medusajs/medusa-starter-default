import { Container, Heading, Text } from "@medusajs/ui"

interface PurchaseOrder {
  id: string
  order_date: string
  expected_delivery_date?: string
  actual_delivery_date?: string
  payment_terms?: string
  notes?: string
}

interface PurchaseOrderGeneralProps {
  data: PurchaseOrder
}

const SectionRow = ({ label, value }: { label: string; value: string | undefined | null }) => {
  return (
    <div className="grid grid-cols-2 items-center px-6 py-4">
      <Text size="small" weight="plus" leading="compact" className="text-ui-fg-subtle">
        {label}
      </Text>
      <Text size="small" leading="compact">
        {value || "—"}
      </Text>
    </div>
  )
}

const formatDate = (date?: string) => {
  if (!date) return null
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export const PurchaseOrderGeneral = ({ data: purchaseOrder }: PurchaseOrderGeneralProps) => {
  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Order Details</Heading>
      </div>
      <SectionRow label="Order Date" value={formatDate(purchaseOrder.order_date)} />
      {purchaseOrder.expected_delivery_date && (
        <SectionRow label="Expected Delivery" value={formatDate(purchaseOrder.expected_delivery_date)} />
      )}
      {purchaseOrder.actual_delivery_date && (
        <SectionRow label="Actual Delivery" value={formatDate(purchaseOrder.actual_delivery_date)} />
      )}
      {purchaseOrder.payment_terms && (
        <SectionRow label="Payment Terms" value={purchaseOrder.payment_terms} />
      )}
      {purchaseOrder.notes && (
        <div className="px-6 py-4">
          <Text size="small" weight="plus" className="text-ui-fg-subtle mb-2">Notes</Text>
          <Text size="small" className="whitespace-pre-line">{purchaseOrder.notes}</Text>
        </div>
      )}
    </Container>
  )
}
