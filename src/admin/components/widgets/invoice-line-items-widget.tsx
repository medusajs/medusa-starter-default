import { Container, Heading, Text, Button, IconButton, toast, Copy } from "@medusajs/ui"
import { Plus, Trash } from "@medusajs/icons"
import { useState } from "react"
import { useQueryClient, useMutation } from "@tanstack/react-query"
import { Thumbnail } from "../common/thumbnail"
import { formatCurrency } from "../../lib/format-currency"
import { AddLineItemModal } from "../modals/add-line-item-modal"

interface InvoiceLineItem {
  id: string
  item_type: "product" | "service" | "labor" | "shipping" | "discount"
  product_id?: string
  variant_id?: string
  title: string
  description?: string
  sku?: string
  quantity: number
  unit_price: number
  total_price: number
  discount_amount: number
  tax_rate: number
  tax_amount: number
  variant_title?: string
  product_title?: string
  thumbnail?: string
}

interface Invoice {
  id: string
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
  line_items?: InvoiceLineItem[]
  currency_code: string
}

interface InvoiceLineItemsWidgetProps {
  data: Invoice
}

const InvoiceLineItemsWidget = ({ data: invoice }: InvoiceLineItemsWidgetProps) => {
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const isDraft = invoice.status === 'draft'

  const deleteLineItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`/admin/invoices/${invoice.id}/line-items/${itemId}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete line item")
      return response.json()
    },
    onSuccess: () => {
      toast.success("Line item deleted")
      queryClient.invalidateQueries({ queryKey: ["invoice", invoice.id] })
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete line item: ${error.message}`)
    }
  })

  return (
    <>
      <Container className="divide-y divide-dashed p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Items & Services</Heading>
          {isDraft && (
            <Button
              size="small"
              variant="secondary"
              onClick={() => setShowAddModal(true)}
            >
              <Plus />
              Add Item
            </Button>
          )}
        </div>

        {invoice.line_items && invoice.line_items.length > 0 ? (
          invoice.line_items.map((item: InvoiceLineItem) => (
            <div
              key={item.id}
              className="text-ui-fg-subtle grid grid-cols-2 items-start gap-x-4 px-6 py-4"
            >
              <div className="flex items-start gap-x-4">
                <Thumbnail src={item.thumbnail} />
                <div>
                  <Text size="small" leading="compact" weight="plus" className="text-ui-fg-base">
                    {item.title}
                  </Text>
                  {item.sku && (
                    <div className="flex items-center gap-x-1">
                      <Text size="small">{item.sku}</Text>
                      <Copy content={item.sku} className="text-ui-fg-muted" />
                    </div>
                  )}
                  {item.variant_title && (
                    <Text size="small">{item.variant_title}</Text>
                  )}
                  {item.description && (
                    <Text size="small" className="text-ui-fg-subtle">
                      {item.description}
                    </Text>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 items-center gap-x-4">
                <div className="flex items-center justify-end gap-x-4">
                  <Text size="small">
                    {formatCurrency(item.unit_price, invoice.currency_code)}
                  </Text>
                </div>

                <div className="flex items-center gap-x-2">
                  <div className="w-fit min-w-[27px]">
                    <Text size="small">
                      <span className="tabular-nums">{item.quantity}</span>x
                    </Text>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-x-2">
                  <Text size="small">
                    {formatCurrency(item.total_price, invoice.currency_code)}
                  </Text>
                  {isDraft && (
                    <IconButton
                      size="small"
                      variant="transparent"
                      onClick={() => deleteLineItemMutation.mutate(item.id)}
                    >
                      <Trash />
                    </IconButton>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="px-6 py-4">
            <Text size="small" className="text-ui-fg-muted">
              No items in this invoice
            </Text>
          </div>
        )}
      </Container>

      {showAddModal && (
        <AddLineItemModal
          invoiceId={invoice.id}
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </>
  )
}

export default InvoiceLineItemsWidget
