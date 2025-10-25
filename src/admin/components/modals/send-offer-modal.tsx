import { useState } from "react"
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

interface Offer {
  id: string
  offer_number: string
  customer_email: string
  total_amount: number
  valid_until: string
  currency_code: string
}

interface SendOfferModalProps {
  offer: Offer
  isOpen: boolean
  onClose: () => void
}

interface SendOfferFormData {
  to: string
  subject: string
  message: string
}

/**
 * Send Offer Modal
 * Allows sending an offer via email to the customer
 * Following the pattern from SendInvoiceModal
 */
export const SendOfferModal = ({ offer, isOpen, onClose }: SendOfferModalProps) => {
  const queryClient = useQueryClient()

  const form = useForm<SendOfferFormData>({
    defaultValues: {
      to: offer.customer_email,
      subject: `Offer ${offer.offer_number}`,
      message: `Dear customer,\n\nPlease find attached our offer ${offer.offer_number}.\n\nThis offer is valid until ${new Date(offer.valid_until).toLocaleDateString('nl-BE')}.\n\nBest regards`,
    }
  })

  const sendOfferMutation = useMutation({
    mutationFn: async (data: SendOfferFormData) => {
      const response = await fetch(`/admin/offers/${offer.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || errorData.details || 'Failed to send offer')
      }
      return response.json()
    },
    onSuccess: () => {
      toast.success('Offer sent', {
        description: `Offer ${offer.offer_number} has been sent to ${form.getValues('to')}`
      })
      queryClient.invalidateQueries({ queryKey: ['offer', offer.id] })
      queryClient.invalidateQueries({ queryKey: ['offers'] })
      onClose()
    },
    onError: (error: Error) => {
      toast.error(`Failed to send offer: ${error.message}`)
    }
  })

  const handleSubmit = form.handleSubmit((data) => {
    sendOfferMutation.mutate(data)
  })

  return (
    <FocusModal open={isOpen} onOpenChange={onClose}>
      <FocusModal.Content>
        <FocusModal.Header>
          <FocusModal.Title>Send Offer</FocusModal.Title>
          <FocusModal.Description>
            Send offer {offer.offer_number} via email
          </FocusModal.Description>
        </FocusModal.Header>

        <FocusModal.Body className="flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>To *</Label>
                <Input {...form.register('to', { required: true })} type="email" />
              </div>

              <div>
                <Label>Subject *</Label>
                <Input {...form.register('subject', { required: true })} />
              </div>

              <div>
                <Label>Message</Label>
                <Textarea {...form.register('message')} rows={8} />
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
                  isLoading={sendOfferMutation.isPending}
                >
                  Send Offer
                </Button>
              </div>
            </form>
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}

