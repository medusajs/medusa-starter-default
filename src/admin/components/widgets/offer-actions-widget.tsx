import {
  Container,
  Heading,
  Button,
  toast
} from "@medusajs/ui"
import { EnvelopeSolid, DocumentText, ArrowDownTray } from "@medusajs/icons"
import { useState } from "react"
import { SendOfferModal } from "../modals/send-offer-modal"

interface Offer {
  id: string
  offer_number: string
  status: "draft" | "sent" | "accepted" | "rejected" | "expired" | "converted"
  customer_email: string
  total_amount: number
  valid_until: string
  currency_code: string
}

interface OfferActionsWidgetProps {
  data: Offer
}

/**
 * Offer Actions Widget
 * Provides action buttons for offer management
 * Following the pattern from InvoiceActionsWidget
 */
const OfferActionsWidget = ({ data: offer }: OfferActionsWidgetProps) => {
  const [isDownloading, setIsDownloading] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true)
      const response = await fetch(`/admin/offers/${offer.id}/pdf?download=true`)
      if (!response.ok) throw new Error("Failed to download PDF")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `offer-${offer.offer_number}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)

      toast.success("PDF downloaded", {
        description: `Offer ${offer.offer_number} downloaded successfully`
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
      const response = await fetch(`/admin/offers/${offer.id}/pdf?preview=true`)
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

  const isDraft = offer.status === 'draft'
  const isSent = offer.status === 'sent'
  const isAccepted = offer.status === 'accepted'
  const isRejected = offer.status === 'rejected'
  const isExpired = offer.status === 'expired'
  const isConverted = offer.status === 'converted'

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
                Send Offer
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

          {(isSent || isExpired) && (
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

          {(isAccepted || isConverted) && (
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

          {isRejected && (
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
        <SendOfferModal
          offer={offer}
          isOpen={showSendModal}
          onClose={() => setShowSendModal(false)}
        />
      )}
    </>
  )
}

export default OfferActionsWidget

