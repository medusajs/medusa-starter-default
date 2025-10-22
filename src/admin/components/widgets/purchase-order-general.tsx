import { Container, Heading, Text, Label } from "@medusajs/ui"

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

export const PurchaseOrderGeneral = ({ data: purchaseOrder }: PurchaseOrderGeneralProps) => {
  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Order Details</Heading>
      </div>
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label size="small" weight="plus" className="mb-2">
              Order Date
            </Label>
            <Text size="small">
              {new Date(purchaseOrder.order_date).toLocaleDateString()}
            </Text>
          </div>
          {purchaseOrder.expected_delivery_date && (
            <div>
              <Label size="small" weight="plus" className="mb-2">
                Expected Delivery
              </Label>
              <Text size="small">
                {new Date(purchaseOrder.expected_delivery_date).toLocaleDateString()}
              </Text>
            </div>
          )}
          {purchaseOrder.actual_delivery_date && (
            <div>
              <Label size="small" weight="plus" className="mb-2">
                Actual Delivery
              </Label>
              <Text size="small">
                {new Date(purchaseOrder.actual_delivery_date).toLocaleDateString()}
              </Text>
            </div>
          )}
          {purchaseOrder.payment_terms && (
            <div>
              <Label size="small" weight="plus" className="mb-2">
                Payment Terms
              </Label>
              <Text size="small">{purchaseOrder.payment_terms}</Text>
            </div>
          )}
        </div>
      </div>
      {purchaseOrder.notes && (
        <div className="px-6 py-4">
          <Label size="small" weight="plus" className="mb-2">
            Notes
          </Label>
          <Text size="small">{purchaseOrder.notes}</Text>
        </div>
      )}
    </Container>
  )
}
