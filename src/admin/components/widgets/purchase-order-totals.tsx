import { Text } from "@medusajs/ui"
import { useMemo } from "react"
import { Container } from "../common/container"
import { Header } from "../common/header"

interface PurchaseOrderItem {
  id: string
  line_total: number
}

interface PurchaseOrder {
  items: PurchaseOrderItem[]
  tax_amount: number
  shipping_amount: number
  discount_amount: number
  currency_code: string
}

interface PurchaseOrderTotalsProps {
  data: PurchaseOrder
}

const formatCurrency = (amount: number, currency: string) => {
  if (amount === null || amount === undefined) return "N/A"
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD'
  }).format(amount / 100)
}

export const PurchaseOrderTotals = ({ data: purchaseOrder }: PurchaseOrderTotalsProps) => {
  // Calculate subtotal from actual line items
  const subtotal = useMemo(() => {
    return purchaseOrder.items?.reduce((sum, item) => sum + (item.line_total || 0), 0) || 0
  }, [purchaseOrder.items])

  // Calculate total
  const total = useMemo(() => {
    return subtotal + (purchaseOrder.tax_amount || 0) + (purchaseOrder.shipping_amount || 0) - (purchaseOrder.discount_amount || 0)
  }, [subtotal, purchaseOrder.tax_amount, purchaseOrder.shipping_amount, purchaseOrder.discount_amount])

  return (
    <Container>
      <Header title="Summary" />
      <div className="px-6 py-4">
        <div className="flex flex-col gap-y-2">
          <div className="flex items-center justify-between">
            <Text size="small" className="text-ui-fg-subtle">
              Subtotal
            </Text>
            <Text size="small">
              {formatCurrency(subtotal, purchaseOrder.currency_code)}
            </Text>
          </div>
          {purchaseOrder.tax_amount > 0 && (
            <div className="flex items-center justify-between">
              <Text size="small" className="text-ui-fg-subtle">
                Tax
              </Text>
              <Text size="small">
                {formatCurrency(purchaseOrder.tax_amount, purchaseOrder.currency_code)}
              </Text>
            </div>
          )}
          {purchaseOrder.shipping_amount > 0 && (
            <div className="flex items-center justify-between">
              <Text size="small" className="text-ui-fg-subtle">
                Shipping
              </Text>
              <Text size="small">
                {formatCurrency(purchaseOrder.shipping_amount, purchaseOrder.currency_code)}
              </Text>
            </div>
          )}
          {purchaseOrder.discount_amount > 0 && (
            <div className="flex items-center justify-between">
              <Text size="small" className="text-ui-fg-subtle">
                Discount
              </Text>
              <Text size="small" className="text-ui-fg-success">
                -{formatCurrency(purchaseOrder.discount_amount, purchaseOrder.currency_code)}
              </Text>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-ui-border-base pt-2 mt-2">
            <Text weight="plus">Total</Text>
            <Text weight="plus">
              {formatCurrency(total, purchaseOrder.currency_code)}
            </Text>
          </div>
        </div>
      </div>
    </Container>
  )
}
