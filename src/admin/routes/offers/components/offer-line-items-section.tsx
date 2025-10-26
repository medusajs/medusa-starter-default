import { useState } from "react"
import {
  Button,
  Container,
  Heading,
  Text,
  IconButton,
  toast,
} from "@medusajs/ui"
import {
  Plus,
  PencilSquare,
  Trash,
  EllipsisHorizontal,
} from "@medusajs/icons"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { AddOfferLineItemModal } from "../../../components/modals/add-offer-line-item-modal"
import { EditOfferLineItemModal } from "../../../components/modals/edit-offer-line-item-modal"

interface OfferLineItem {
  id: string
  item_type: "product" | "custom"
  title: string
  description?: string
  quantity: number
  unit_price: number
  tax_rate: number
  subtotal: number
  tax_amount: number
  total: number
  notes?: string
}

interface OfferLineItemsSectionProps {
  offerId?: string
  lineItems: OfferLineItem[]
  currencyCode: string
  isCreating?: boolean
  onRefresh?: () => void
}

// Format currency helper
const formatCurrency = (amount: number, currencyCode = "EUR") => {
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(amount / 100) // Convert from cents
}

/**
 * Offer Line Items Section Component
 *
 * Displays line items in a table format with add/edit/delete actions.
 * Used in both create and edit forms.
 */
export const OfferLineItemsSection = ({
  offerId,
  lineItems,
  currencyCode,
  isCreating = false,
  onRefresh,
}: OfferLineItemsSectionProps) => {
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingLineItem, setEditingLineItem] = useState<OfferLineItem | null>(
    null
  )

  // Delete line item mutation
  const deleteLineItemMutation = useMutation({
    mutationFn: async (lineItemId: string) => {
      if (!offerId) throw new Error("Offer ID is required")

      const response = await fetch(
        `/admin/offers/${offerId}/line-items/${lineItemId}`,
        {
          method: "DELETE",
        }
      )
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.error || errorData.details || "Failed to delete line item"
        )
      }
      return response.json()
    },
    onSuccess: () => {
      toast.success("Line item deleted")
      if (onRefresh) {
        onRefresh()
      }
      if (offerId) {
        queryClient.invalidateQueries({ queryKey: ["offer", offerId] })
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete line item: ${error.message}`)
    },
  })

  const handleDeleteLineItem = (lineItemId: string) => {
    if (
      window.confirm("Are you sure you want to delete this line item?")
    ) {
      deleteLineItemMutation.mutate(lineItemId)
    }
  }

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0)
  const taxAmount = lineItems.reduce((sum, item) => sum + item.tax_amount, 0)
  const total = lineItems.reduce((sum, item) => sum + item.total, 0)

  return (
    <Container className="p-6">
      <div className="flex items-center justify-between mb-4">
        <Heading level="h2">Line Items</Heading>
        <Button
          size="small"
          variant="secondary"
          onClick={() => setShowAddModal(true)}
          disabled={!offerId && !isCreating}
        >
          <Plus className="mr-2" />
          Add Line Item
        </Button>
      </div>

      {lineItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-ui-border-base rounded-lg bg-ui-bg-subtle">
          <Text weight="plus" className="mb-1">
            No line items added
          </Text>
          <Text size="small" className="text-ui-fg-subtle mb-4">
            Add products or custom line items to this offer
          </Text>
          <Button
            size="small"
            variant="secondary"
            onClick={() => setShowAddModal(true)}
            disabled={!offerId && !isCreating}
          >
            <Plus className="mr-2" />
            Add First Line Item
          </Button>
        </div>
      ) : (
        <>
          {/* Line Items Table */}
          <div className="divide-y divide-ui-border-base border border-ui-border-base rounded-lg overflow-hidden">
            {lineItems.map((item) => (
              <div
                key={item.id}
                className="p-4 hover:bg-ui-bg-subtle transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <Text weight="plus">{item.title}</Text>
                        {item.description && (
                          <Text
                            size="small"
                            className="text-ui-fg-subtle mt-1"
                          >
                            {item.description}
                          </Text>
                        )}
                        {item.notes && (
                          <Text
                            size="small"
                            className="text-ui-fg-muted mt-1 italic"
                          >
                            Note: {item.notes}
                          </Text>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 mt-3 text-sm text-ui-fg-subtle">
                      <div>
                        Qty: <span className="font-medium">{item.quantity}</span>
                      </div>
                      <div>
                        Unit Price:{" "}
                        <span className="font-medium">
                          {formatCurrency(item.unit_price, currencyCode)}
                        </span>
                      </div>
                      <div>
                        Tax:{" "}
                        <span className="font-medium">
                          {(item.tax_rate * 100).toFixed(2)}%
                        </span>
                      </div>
                      <div>
                        Total:{" "}
                        <span className="font-medium">
                          {formatCurrency(item.total, currencyCode)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <IconButton
                      size="small"
                      variant="transparent"
                      onClick={() => setEditingLineItem(item)}
                    >
                      <PencilSquare />
                    </IconButton>
                    <IconButton
                      size="small"
                      variant="transparent"
                      onClick={() => handleDeleteLineItem(item.id)}
                      disabled={deleteLineItemMutation.isPending}
                    >
                      <Trash />
                    </IconButton>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals Summary */}
          <div className="mt-4 p-4 bg-ui-bg-subtle rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <Text className="text-ui-fg-subtle">Subtotal</Text>
              <Text weight="plus">
                {formatCurrency(subtotal, currencyCode)}
              </Text>
            </div>
            <div className="flex justify-between text-sm">
              <Text className="text-ui-fg-subtle">Tax</Text>
              <Text weight="plus">
                {formatCurrency(taxAmount, currencyCode)}
              </Text>
            </div>
            <div className="flex justify-between pt-2 border-t border-ui-border-base">
              <Text weight="plus">Total</Text>
              <Text weight="plus" size="large">
                {formatCurrency(total, currencyCode)}
              </Text>
            </div>
          </div>
        </>
      )}

      {/* Add Line Item Modal */}
      {offerId && (
        <>
          <AddOfferLineItemModal
            offerId={offerId}
            isOpen={showAddModal}
            onClose={() => {
              setShowAddModal(false)
              if (onRefresh) onRefresh()
            }}
          />

          {editingLineItem && (
            <EditOfferLineItemModal
              offerId={offerId}
              lineItem={editingLineItem}
              isOpen={!!editingLineItem}
              onClose={() => {
                setEditingLineItem(null)
                if (onRefresh) onRefresh()
              }}
            />
          )}
        </>
      )}

      {/* Warning for creating mode */}
      {isCreating && !offerId && (
        <div className="mt-4 p-3 bg-ui-bg-base border border-ui-border-strong rounded-lg">
          <Text size="small" className="text-ui-fg-subtle">
            Save the offer first to add line items
          </Text>
        </div>
      )}
    </Container>
  )
}
