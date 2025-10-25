import { useState, useEffect } from "react"
import {
  FocusModal,
  Button,
  Input,
  Textarea,
  Label,
  toast,
  Text,
} from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"

interface EditOfferLineItemModalProps {
  offerId: string
  lineItem: {
    id: string
    item_type: "product" | "custom" | "discount"
    title: string
    description?: string
    quantity: number
    unit_price: number
    tax_rate: number
    notes?: string
  }
  isOpen: boolean
  onClose: () => void
}

interface LineItemFormData {
  title: string
  description: string
  quantity: number
  unit_price: number
  tax_rate: number
  notes?: string
}

/**
 * Edit Offer Line Item Modal
 * Allows editing existing line items in an offer
 * Following the pattern from EditLineItemModal (invoices)
 */
export const EditOfferLineItemModal = ({ 
  offerId, 
  lineItem, 
  isOpen, 
  onClose 
}: EditOfferLineItemModalProps) => {
  const queryClient = useQueryClient()

  const form = useForm<LineItemFormData>({
    defaultValues: {
      title: lineItem.title,
      description: lineItem.description || '',
      quantity: lineItem.quantity,
      unit_price: lineItem.unit_price,
      tax_rate: lineItem.tax_rate * 100, // Convert decimal to percentage
      notes: lineItem.notes || '',
    }
  })

  // Reset form when lineItem changes
  useEffect(() => {
    if (isOpen && lineItem) {
      form.reset({
        title: lineItem.title,
        description: lineItem.description || '',
        quantity: lineItem.quantity,
        unit_price: lineItem.unit_price,
        tax_rate: lineItem.tax_rate * 100, // Convert decimal to percentage
        notes: lineItem.notes || '',
      })
    }
  }, [isOpen, lineItem, form])

  const updateLineItemMutation = useMutation({
    mutationFn: async (data: LineItemFormData) => {
      // Convert tax_rate percentage to decimal before sending to API
      const payload = {
        ...data,
        unit_price: Math.round(data.unit_price), // Keep in cents (ensure integer)
        tax_rate: data.tax_rate / 100, // Convert percentage to decimal (21 -> 0.21)
      }

      const response = await fetch(`/admin/offers/${offerId}/line-items/${lineItem.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || errorData.details || 'Failed to update line item')
      }
      return response.json()
    },
    onSuccess: () => {
      toast.success('Line item updated')
      queryClient.invalidateQueries({ queryKey: ['offer', offerId] })
      onClose()
    },
    onError: (error: Error) => {
      toast.error(`Failed to update line item: ${error.message}`)
    }
  })

  const handleSubmit = form.handleSubmit((data) => {
    updateLineItemMutation.mutate(data)
  })

  return (
    <FocusModal open={isOpen} onOpenChange={onClose}>
      <FocusModal.Content>
        <FocusModal.Header>
          <FocusModal.Title>Edit Line Item</FocusModal.Title>
          <FocusModal.Description>
            Update the line item details
          </FocusModal.Description>
        </FocusModal.Header>

        <FocusModal.Body className="flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4">
            <div className="w-full max-w-2xl mx-auto">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="p-4 bg-ui-bg-subtle rounded-lg mb-4">
                  <Text size="small" className="text-ui-fg-muted mb-1">
                    Item Type
                  </Text>
                  <Text weight="plus">
                    {lineItem.item_type.charAt(0).toUpperCase() + lineItem.item_type.slice(1)}
                  </Text>
                </div>

                <div>
                  <Label>Title *</Label>
                  <Input {...form.register('title', { required: true })} />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea {...form.register('description')} rows={3} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      step="1"
                      {...form.register('quantity', { required: true, valueAsNumber: true })}
                    />
                  </div>

                  <div>
                    <Label>Unit Price *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register('unit_price', { required: true, valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Tax Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...form.register('tax_rate', { valueAsNumber: true })}
                    placeholder="21"
                  />
                </div>

                <div>
                  <Label>Comment (appears on offer)</Label>
                  <Textarea 
                    {...form.register('notes')} 
                    rows={2}
                    placeholder="Optional comment to display on the offer"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    size="small"
                    type="button"
                    variant="secondary"
                    onClick={onClose}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    type="submit"
                    isLoading={updateLineItemMutation.isPending}
                  >
                    Update Line Item
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}

