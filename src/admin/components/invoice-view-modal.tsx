import React, { useState } from "react"
import {
  FocusModal,
  Button,
  Heading,
  Text,
  Badge,
  IconButton,
  Container,
  toast
} from "@medusajs/ui"
import {
  XMark,
  ArrowDownTray,
  DocumentText,
  Eye,
  Spinner
} from "@medusajs/icons"
import { useQuery, useMutation } from "@tanstack/react-query"
import { InvoiceStatusBadge } from "./common/invoice-status-badge"

// Types
interface Invoice {
  id: string
  invoice_number: string
  invoice_type: "product_sale" | "service_work" | "mixed"
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
  currency_code: string
  subtotal_amount: number
  tax_amount: number
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
  order_id?: string
  service_order_id?: string
  pdf_file_id?: string
  notes?: string
  created_at: string
  updated_at: string
}

interface InvoiceViewModalProps {
  invoice: Invoice
  isOpen: boolean
  onClose: () => void
}

// Format currency for Belgian locale
const formatCurrency = (amount: number, currencyCode = "EUR") => {
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(amount / 100)
}

// Format date for Belgian locale
const formatDate = (date: string) => {
  return new Intl.DateTimeFormat("nl-BE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date))
}

// Type badge component
const InvoiceTypeBadge = ({ type }: { type: Invoice["invoice_type"] }) => {
  const typeConfig = {
    product_sale: { color: "blue" as const, label: "Productverkoop" },
    service_work: { color: "green" as const, label: "Servicewerk" },
    mixed: { color: "purple" as const, label: "Gemengd" }
  }

  const config = typeConfig[type]

  return (
    <Badge color={config.color}>
      {config.label}
    </Badge>
  )
}

// Hooks for API calls
const useInvoicePdf = (invoiceId: string) => {
  return useQuery({
    queryKey: ["invoice-pdf", invoiceId],
    queryFn: async () => {
      const response = await fetch(`/admin/invoices/${invoiceId}/pdf?preview=true`)
      if (!response.ok) throw new Error("Failed to fetch invoice PDF")
      return response.json()
    },
    enabled: !!invoiceId,
  })
}

const useInvoiceHtmlContent = (fileUrl?: string) => {
  return useQuery({
    queryKey: ["invoice-html-content", fileUrl],
    queryFn: async () => {
      if (!fileUrl) throw new Error("No file URL provided")
      const response = await fetch(fileUrl)
      if (!response.ok) throw new Error("Failed to fetch HTML content")
      return response.text()
    },
    enabled: !!fileUrl,
  })
}

const useDownloadInvoice = () => {
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      // Trigger download by opening URL with download parameter
      const response = await fetch(`/admin/invoices/${invoiceId}/pdf?download=true`)
      if (!response.ok) throw new Error("Failed to download invoice")
      
      // Create blob from response and trigger download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `factuur-${Date.now()}.html` // Fallback filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      return { success: true }
    },
    onSuccess: () => {
      toast.success("Download gestart", {
        description: "De factuur wordt gedownload.",
      })
    },
    onError: () => {
      toast.error("Fout", {
        description: "Er is een fout opgetreden bij het downloaden van de factuur.",
      })
    },
  })
}

export const InvoiceViewModal: React.FC<InvoiceViewModalProps> = ({
  invoice,
  isOpen,
  onClose,
}) => {
  const { data: pdfData, isLoading: isPdfLoading, error: pdfError } = useInvoicePdf(invoice.id)
  const { data: htmlContent, isLoading: isHtmlLoading } = useInvoiceHtmlContent(pdfData?.file?.url)
  const downloadInvoice = useDownloadInvoice()

  const handleDownload = () => {
    downloadInvoice.mutate(invoice.id)
  }

  const customer = invoice.customer
  const customerName = customer?.company_name || 
    (customer ? `${customer.first_name} ${customer.last_name}` : "Onbekende klant")

  return (
    <FocusModal open={isOpen} onOpenChange={onClose}>
      <FocusModal.Content>
        <FocusModal.Header>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <DocumentText className="w-6 h-6" />
              <div>
                <Heading level="h2" className="text-xl">
                  Factuur {invoice.invoice_number}
                </Heading>
                <Text className="text-ui-fg-subtle" size="small">
                  {customerName} • {formatDate(invoice.invoice_date)}
                </Text>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="small"
                variant="secondary"
                onClick={handleDownload}
                disabled={downloadInvoice.isPending}
              >
                <ArrowDownTray className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </FocusModal.Header>

        <FocusModal.Body className="p-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* Invoice Details Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              <Container className="p-4">
                <Heading level="h3" className="mb-3">Factuurgegevens</Heading>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Text size="small" className="text-ui-fg-subtle">Status:</Text>
                    <InvoiceStatusBadge status={invoice.status} />
                  </div>
                  <div className="flex justify-between items-center">
                    <Text size="small" className="text-ui-fg-subtle">Type:</Text>
                    <InvoiceTypeBadge type={invoice.invoice_type} />
                  </div>
                  <div className="flex justify-between items-center">
                    <Text size="small" className="text-ui-fg-subtle">Factuurdatum:</Text>
                    <Text size="small">{formatDate(invoice.invoice_date)}</Text>
                  </div>
                  <div className="flex justify-between items-center">
                    <Text size="small" className="text-ui-fg-subtle">Vervaldatum:</Text>
                    <Text size="small">{formatDate(invoice.due_date)}</Text>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center">
                      <Text weight="plus">Totaal:</Text>
                      <Text weight="plus" className="text-lg">
                        {formatCurrency(invoice.total_amount, invoice.currency_code)}
                      </Text>
                    </div>
                  </div>
                </div>
              </Container>

              {customer && (
                <Container className="p-4">
                  <Heading level="h3" className="mb-3">Klantgegevens</Heading>
                  <div className="space-y-2">
                    <Text weight="plus">{customerName}</Text>
                    <Text size="small" className="text-ui-fg-subtle">{customer.email}</Text>
                  </div>
                </Container>
              )}

              {invoice.notes && (
                <Container className="p-4">
                  <Heading level="h3" className="mb-3">Opmerkingen</Heading>
                  <Text size="small">{invoice.notes}</Text>
                </Container>
              )}
            </div>

            {/* PDF Preview */}
            <div className="lg:col-span-2">
              <Container className="p-4 h-full">
                <div className="flex items-center justify-between mb-4">
                  <Heading level="h3">Voorbeeld</Heading>
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <Text size="small" className="text-ui-fg-subtle">
                      PDF Voorbeeld
                    </Text>
                  </div>
                </div>
                
                <div className="border border-ui-border-base rounded-lg bg-white h-[600px] overflow-hidden">
                  {isPdfLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      <Spinner className="w-8 h-8" />
                      <Text size="small" className="text-ui-fg-subtle">
                        Factuur wordt geladen...
                      </Text>
                    </div>
                  ) : pdfError ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
                      <DocumentText className="w-12 h-12 text-ui-fg-muted" />
                      <div>
                        <Text weight="plus" className="text-ui-fg-base">
                          Factuur kon niet worden geladen
                        </Text>
                        <Text size="small" className="text-ui-fg-subtle">
                          Probeer de factuur te downloaden
                        </Text>
                      </div>
                      <Button size="small" variant="secondary" onClick={handleDownload}>
                        <ArrowDownTray className="w-4 h-4 mr-2" />
                        Download Factuur
                      </Button>
                    </div>
                  ) : pdfData?.file?.url ? (
                    <div className="h-full">
                      {pdfData.file.content_type === 'application/pdf' ? (
                        <iframe
                          src={pdfData.file.url}
                          className="w-full h-full border-0 rounded"
                          title={`Factuur ${invoice.invoice_number} PDF Voorbeeld`}
                        />
                      ) : htmlContent ? (
                        <div className="h-full overflow-auto">
                          <div 
                            className="invoice-preview"
                            dangerouslySetInnerHTML={{ __html: htmlContent }}
                            style={{ 
                              transform: 'scale(0.75)', 
                              transformOrigin: 'top left',
                              width: '133%',
                              minHeight: '133%'
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
                          <DocumentText className="w-12 h-12 text-ui-fg-muted" />
                          <div>
                            <Text weight="plus" className="text-ui-fg-base">
                              Factuur voorbeeld
                            </Text>
                            <Text size="small" className="text-ui-fg-subtle">
                              PDF wordt gegenereerd via MedusaJS Documents plugin
                            </Text>
                          </div>
                          <Button size="small" variant="secondary" onClick={handleDownload}>
                            <ArrowDownTray className="w-4 h-4 mr-2" />
                            Download PDF
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
                      <DocumentText className="w-12 h-12 text-ui-fg-muted" />
                      <div>
                        <Text weight="plus" className="text-ui-fg-base">
                          Voorbeeld niet beschikbaar
                        </Text>
                        <Text size="small" className="text-ui-fg-subtle">
                          Download de factuur om de inhoud te bekijken
                        </Text>
                      </div>
                      <Button size="small" variant="secondary" onClick={handleDownload}>
                        <ArrowDownTray className="w-4 h-4 mr-2" />
                        Download Factuur
                      </Button>
                    </div>
                  )}
                </div>
              </Container>
            </div>
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}

export default InvoiceViewModal