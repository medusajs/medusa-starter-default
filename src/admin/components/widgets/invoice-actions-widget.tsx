import {
  Container,
  Heading,
  Button,
  toast
} from "@medusajs/ui"
import { EnvelopeSolid, DocumentText, ArrowDownTray } from "@medusajs/icons"
import { useState } from "react"
import { SendInvoiceModal } from "../modals/send-invoice-modal"

interface Invoice {
  id: string
  invoice_number: string
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
  customer_email: string
  total_amount: number
  due_date: string
  currency_code: string
}

interface InvoiceActionsWidgetProps {
  data: Invoice
}

const InvoiceActionsWidget = ({ data: invoice }: InvoiceActionsWidgetProps) => {
  const [isDownloading, setIsDownloading] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true)
      const response = await fetch(`/admin/invoices/${invoice.id}/pdf?download=true`)
      if (!response.ok) throw new Error("Failed to download PDF")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `factuur-${invoice.invoice_number}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)

      toast.success("PDF downloaded", {
        description: `Invoice ${invoice.invoice_number} downloaded successfully`
      })
    } catch (error) {
      toast.error("Failed to download PDF", {
        description: error instanceof Error ? error.message : "Unknown error"
      })
    } finally {
      setIsDownloading(false)
    }
  }

  const handlePreviewPdf = async () => {
    try {
      setIsPreviewing(true)
      const response = await fetch(`/admin/invoices/${invoice.id}/pdf`)
      if (!response.ok) throw new Error("Failed to load PDF")

      const data = await response.json()
      window.open(data.file.url, '_blank')
    } catch (error) {
      toast.error("Failed to preview PDF", {
        description: error instanceof Error ? error.message : "Unknown error"
      })
    } finally {
      setIsPreviewing(false)
    }
  }

  const isDraft = invoice.status === 'draft'
  const isSent = invoice.status === 'sent'
  const isPaid = invoice.status === 'paid'
  const isOverdue = invoice.status === 'overdue'
  const isCancelled = invoice.status === 'cancelled'

  return (
    <>
      <Container className="divide-y divide-dashed p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Actions</Heading>
        </div>

        <div className="flex flex-col gap-y-2 px-6 py-4">
          {isDraft && (
            <>
              <Button
                variant="primary"
                size="base"
                onClick={() => setShowSendModal(true)}
              >
                <EnvelopeSolid />
                Send Invoice
              </Button>
              <Button
                variant="secondary"
                size="base"
                onClick={handlePreviewPdf}
                isLoading={isPreviewing}
              >
                <DocumentText />
                Preview PDF
              </Button>
            </>
          )}

          {(isSent || isOverdue) && (
            <>
              <Button
                variant="primary"
                size="base"
                onClick={handleDownloadPdf}
                isLoading={isDownloading}
              >
                <ArrowDownTray />
                Download PDF
              </Button>
              <Button
                variant="secondary"
                size="base"
                onClick={handlePreviewPdf}
                isLoading={isPreviewing}
              >
                <DocumentText />
                Preview PDF
              </Button>
            </>
          )}

          {isPaid && (
            <>
              <Button
                variant="primary"
                size="base"
                onClick={handleDownloadPdf}
                isLoading={isDownloading}
              >
                <ArrowDownTray />
                Download PDF
              </Button>
              <Button
                variant="secondary"
                size="base"
                onClick={handlePreviewPdf}
                isLoading={isPreviewing}
              >
                <DocumentText />
                Preview PDF
              </Button>
            </>
          )}

          {isCancelled && (
            <Button
              variant="secondary"
              size="base"
              onClick={handleDownloadPdf}
              isLoading={isDownloading}
            >
              <ArrowDownTray />
              Download PDF
            </Button>
          )}
        </div>
      </Container>

      {showSendModal && (
        <SendInvoiceModal
          invoice={invoice}
          isOpen={showSendModal}
          onClose={() => setShowSendModal(false)}
        />
      )}
    </>
  )
}

export default InvoiceActionsWidget
