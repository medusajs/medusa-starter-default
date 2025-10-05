import {
  FocusModal,
  Button,
  Input,
  Textarea,
  Select,
  Label,
  Text,
  Heading,
  toast
} from "@medusajs/ui"
import { useForm, Controller } from "react-hook-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"

interface SendInvoiceModalProps {
  invoice: {
    id: string
    invoice_number: string
    customer_email: string
    total_amount: number
    due_date: string
    currency_code: string
  }
  isOpen: boolean
  onClose: () => void
}

export const SendInvoiceModal = ({ invoice, isOpen, onClose }: SendInvoiceModalProps) => {
  const queryClient = useQueryClient()

  const form = useForm({
    defaultValues: {
      recipient_email: invoice.customer_email,
      cc_emails: '',
      custom_message: '',
      language: 'nl',
    }
  })

  const sendInvoiceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/admin/invoices/${invoice.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          cc_emails: data.cc_emails ? data.cc_emails.split(',').map((e: string) => e.trim()) : []
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Failed to send invoice')
      }
      return response.json()
    },
    onSuccess: (data) => {
      toast.success(`Invoice sent to ${data.sent_to}`)
      queryClient.invalidateQueries({ queryKey: ['invoice', invoice.id] })
      onClose()
    },
    onError: (error: Error) => {
      toast.error(`Failed to send invoice: ${error.message}`)
    }
  })

  const handleSubmit = form.handleSubmit((data) => {
    sendInvoiceMutation.mutate(data)
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-BE', {
      style: 'currency',
      currency: invoice.currency_code
    }).format(amount)
  }

  return (
    <FocusModal open={isOpen} onOpenChange={onClose}>
      <FocusModal.Content>
        <FocusModal.Header>
          <div className="flex items-center justify-end">
            <FocusModal.Close asChild>
              <Button size="small" variant="secondary">Cancel</Button>
            </FocusModal.Close>
          </div>
        </FocusModal.Header>
        <FocusModal.Body>
          <div className="flex flex-col items-center p-16">
            <div className="w-full max-w-lg">
              <div className="mb-8 text-center">
                <Heading level="h2" className="mb-2">Send Invoice</Heading>
                <Text className="text-ui-fg-subtle">
                  Send {invoice.invoice_number} to customer via email
                </Text>
              </div>

              {/* Invoice Summary */}
              <div className="bg-ui-bg-subtle p-4 rounded-md mb-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Text size="small" className="text-ui-fg-subtle">Invoice:</Text>
                    <Text size="small" weight="plus">{invoice.invoice_number}</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text size="small" className="text-ui-fg-subtle">Total:</Text>
                    <Text size="small" weight="plus">{formatCurrency(invoice.total_amount)}</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text size="small" className="text-ui-fg-subtle">Due Date:</Text>
                    <Text size="small">{new Date(invoice.due_date).toLocaleDateString('nl-BE')}</Text>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Recipient Email *</Label>
                  <Input {...form.register('recipient_email', { required: true })} />
                </div>

                <div>
                  <Label>CC Emails</Label>
                  <Input
                    {...form.register('cc_emails')}
                    placeholder="email1@example.com, email2@example.com"
                  />
                  <Text size="xsmall" className="text-ui-fg-subtle mt-1">
                    Separate multiple emails with commas
                  </Text>
                </div>

                <div>
                  <Label>Language</Label>
                  <Controller
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                      <Select {...field} onValueChange={field.onChange}>
                        <Select.Trigger>
                          <Select.Value />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="nl">Dutch</Select.Item>
                          <Select.Item value="fr">French</Select.Item>
                          <Select.Item value="en">English</Select.Item>
                        </Select.Content>
                      </Select>
                    )}
                  />
                </div>

                <div>
                  <Label>Custom Message (Optional)</Label>
                  <Textarea
                    {...form.register('custom_message')}
                    rows={4}
                    placeholder="Add a personal message to include in the email..."
                  />
                </div>

                <div className="bg-orange-50 border border-orange-200 p-3 rounded-md">
                  <Text size="small" className="text-orange-800">
                    <strong>Note:</strong> Once sent, this invoice will be locked and cannot be edited.
                  </Text>
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
                    isLoading={sendInvoiceMutation.isPending}
                  >
                    Send Invoice
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
