import { useState } from "react"
import {
  Button,
  Heading,
  Text,
  Input,
  Textarea,
  toast,
  Badge,
} from "@medusajs/ui"
import { ExclamationCircle, XMark } from "@medusajs/icons"
import { useCustomTranslation } from "../hooks/use-custom-translation"

interface Invoice {
  id: string
  invoice_number: string
  invoice_type: "product_sale" | "service_work" | "mixed"
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
  currency_code: string
  total_amount: number
  invoice_date: string
  due_date: string
  customer?: {
    id: string
    first_name: string
    last_name: string
    company_name?: string
    email: string
  }
  line_items?: any[]
}

interface InvoiceMergeModalProps {
  invoices: Invoice[]
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: { notes?: string; payment_terms?: string }) => Promise<void>
  isLoading?: boolean
}

export const InvoiceMergeModal = ({
  invoices,
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: InvoiceMergeModalProps) => {
  const { t } = useCustomTranslation()
  const [notes, setNotes] = useState("")
  const [paymentTerms, setPaymentTerms] = useState("")

  if (!isOpen || invoices.length === 0) return null

  // Calculate summary
  const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0)
  const totalLineItems = invoices.reduce(
    (sum, inv) => sum + (inv.line_items?.length || 0),
    0
  )
  const currency = invoices[0]?.currency_code || "EUR"
  const customer = invoices[0]?.customer

  const handleConfirm = async () => {
    try {
      await onConfirm({
        notes: notes.trim() || undefined,
        payment_terms: paymentTerms.trim() || undefined,
      })
    } catch (error) {
      // Error handling is done by parent
    }
  }

  const formatCurrency = (amount: number, currencyCode: string = "EUR") => {
    return new Intl.NumberFormat("nl-BE", {
      style: "currency",
      currency: currencyCode,
    }).format(amount / 100)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("nl-BE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <Heading level="h2">
            {t("custom.invoices.merge.confirmTitle", { count: invoices.length })}
          </Heading>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <XMark />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <ExclamationCircle className="text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <Text className="font-medium text-orange-900">
                {t("custom.invoices.merge.warning")}
              </Text>
            </div>
          </div>

          {/* Customer Info */}
          {customer && (
            <div>
              <Text className="text-sm font-medium text-gray-700 mb-2">
                {t("custom.invoices.merge.labels.customer")}
              </Text>
              <div className="p-3 bg-gray-50 rounded border">
                <Text className="font-medium">
                  {customer.company_name || `${customer.first_name} ${customer.last_name}`}
                </Text>
                <Text className="text-sm text-gray-600">{customer.email}</Text>
              </div>
            </div>
          )}

          {/* Source Invoices */}
          <div>
            <Text className="text-sm font-medium text-gray-700 mb-2">
              {t("custom.invoices.merge.labels.sourceInvoices")}
            </Text>
            <div className="space-y-2">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                >
                  <div className="flex items-center gap-3">
                    <Text className="font-medium">{invoice.invoice_number}</Text>
                    <Badge size="small" color="grey">
                      {formatDate(invoice.invoice_date)}
                    </Badge>
                  </div>
                  <Text className="font-semibold">
                    {formatCurrency(invoice.total_amount, invoice.currency_code)}
                  </Text>
                </div>
              ))}
            </div>
          </div>

          {/* Merged Invoice Summary */}
          <div>
            <Text className="text-sm font-medium text-gray-700 mb-2">
              {t("custom.invoices.merge.labels.mergedInvoice")}
            </Text>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Text className="text-sm text-gray-600">
                    {t("custom.invoices.merge.labels.totalAmount")}
                  </Text>
                  <Text className="text-lg font-bold text-blue-900">
                    {formatCurrency(totalAmount, currency)}
                  </Text>
                </div>
                <div>
                  <Text className="text-sm text-gray-600">
                    {t("custom.invoices.merge.labels.totalLineItems")}
                  </Text>
                  <Text className="text-lg font-bold text-blue-900">
                    {totalLineItems}
                  </Text>
                </div>
                <div>
                  <Text className="text-sm text-gray-600">
                    {t("custom.invoices.merge.labels.currency")}
                  </Text>
                  <Text className="font-medium">{currency}</Text>
                </div>
                <div>
                  <Text className="text-sm text-gray-600">
                    {t("custom.invoices.status.draft")}
                  </Text>
                  <Badge size="small" color="grey">
                    {t("custom.invoices.status.draft")}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                {t("custom.invoices.merge.labels.additionalNotes")}
              </Text>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes for the merged invoice..."
                rows={3}
                disabled={isLoading}
              />
            </label>
          </div>

          {/* Payment Terms */}
          <div>
            <label className="block">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                {t("custom.invoices.merge.labels.paymentTerms")}
              </Text>
              <Input
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="NET30"
                disabled={isLoading}
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-gray-50">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading} isLoading={isLoading}>
            {t("custom.invoices.merge.button")}
          </Button>
        </div>
      </div>
    </div>
  )
}

