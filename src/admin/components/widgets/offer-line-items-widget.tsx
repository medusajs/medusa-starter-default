import { Container, Heading, Text, Button, IconButton, toast, Copy } from "@medusajs/ui"
import { Plus, Trash, PencilSquare } from "@medusajs/icons"
import { useState } from "react"
import { useQueryClient, useMutation } from "@tanstack/react-query"
import { Thumbnail } from "../common/thumbnail"
import { formatCurrency } from "../../lib/format-currency"
import { AddOfferLineItemModal } from "../modals/add-offer-line-item-modal"
import { EditOfferLineItemModal } from "../modals/edit-offer-line-item-modal"

interface OfferLineItem {
  id: string
  item_type: "product" | "custom" | "discount"
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
  notes?: string
}

interface Offer {
  id: string
  status: "draft" | "sent" | "accepted" | "rejected" | "expired" | "converted"
  line_items?: OfferLineItem[]
  currency_code: string
}

interface OfferLineItemsWidgetProps {
  data: Offer
}

/**
 * Offer Line Items Widget
 * Displays and manages line items for an offer
 * Following the pattern from InvoiceLineItemsWidget
 */
const OfferLineItemsWidget = ({ data: offer }: OfferLineItemsWidgetProps) => {
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingItem, setEditingItem] = useState<OfferLineItem | null>(null)
  const isDraft = offer.status === 'draft'

  const deleteLineItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`/admin/offers/${offer.id}/line-items/${itemId}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete line item")
      return response.json()
    },
    onSuccess: () => {
      toast.success("Line item deleted")
      queryClient.invalidateQueries({ queryKey: ["offer", offer.id] })
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete line item: ${error.message}`)
    }
  })

  const handleEditLineItem = (item: OfferLineItem) => {
    setEditingItem(item)
    setShowEditModal(true)
  }

  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setEditingItem(null)
  }

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

        {offer.line_items && offer.line_items.length > 0 ? (
          offer.line_items.map((item: OfferLineItem) => (
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
                  {item.notes && (
                    <Text size="small" className="text-ui-fg-muted italic">
                      Note: {item.notes}
                    </Text>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 items-center gap-x-4">
                <div className="flex items-center justify-end gap-x-4">
                  <Text size="small">
                    {formatCurrency(item.unit_price, offer.currency_code)}
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
                    {formatCurrency(item.total_price, offer.currency_code)}
                  </Text>
                  {isDraft && (
                    <>
                      <IconButton
                        size="small"
                        variant="transparent"
                        onClick={() => handleEditLineItem(item)}
                      >
                        <PencilSquare />
                      </IconButton>
                      <IconButton
                        size="small"
                        variant="transparent"
                        onClick={() => deleteLineItemMutation.mutate(item.id)}
                      >
                        <Trash />
                      </IconButton>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="px-6 py-4">
            <Text size="small" className="text-ui-fg-muted">
              No items in this offer
            </Text>
          </div>
        )}
      </Container>

      {showAddModal && (
        <AddOfferLineItemModal
          offerId={offer.id}
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showEditModal && editingItem && (
        <EditOfferLineItemModal
          offerId={offer.id}
          lineItem={editingItem}
          isOpen={showEditModal}
          onClose={handleCloseEditModal}
        />
      )}
    </>
  )
}

export default OfferLineItemsWidget

