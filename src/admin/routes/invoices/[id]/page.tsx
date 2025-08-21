import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowLeft } from "@medusajs/icons"
import { Button, Heading, StatusBadge, Text, Container, Label } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { TwoColumnPage } from "../../../components/layout/pages"
import { SingleColumnPageSkeleton } from "../../../components/common/skeleton"

// Types for invoice data
interface Address {
  first_name?: string
  last_name?: string
  company?: string
  address_1?: string
  address_2?: string
  city?: string
  postal_code?: string
  province?: string
  country_code?: string
  phone?: string
}

interface Customer {
  id: string
  first_name: string
  last_name: string
  company_name?: string
  email: string
  phone?: string
}

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
  invoice_number: string
  invoice_type: "product_sale" | "service_work" | "mixed"
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
  currency_code: string
  subtotal: number
  tax_amount: number
  total_amount: number
  discount_amount: number
  invoice_date: string
  due_date: string
  customer?: Customer
  customer_email: string
  customer_phone?: string
  billing_address: Address
  shipping_address?: Address
  order_id?: string
  service_order_id?: string
  pdf_file_id?: string
  notes?: string
  payment_terms?: string
  created_at: string
  updated_at: string
  line_items?: InvoiceLineItem[]
}

const InvoiceDetails = () => {
  const { id } = useParams()

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const response = await fetch(`/admin/invoices/${id}`)
      if (!response.ok) throw new Error("Failed to fetch invoice")
      return response.json()
    },
    enabled: !!id,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  })

  if (isLoading || !invoice) {
    return <SingleColumnPageSkeleton sections={3} showJSON showMetadata />
  }

  if (error) {
    throw error
  }

  const inv = invoice.invoice

  const statusVariants = {
    draft: "orange",
    sent: "blue",
    paid: "green",
    overdue: "red",
    cancelled: "red",
  } as const

  const invoiceTypeVariants = {
    product_sale: "green",
    service_work: "purple",
    mixed: "blue",
  } as const

  // Belgium-specific currency formatting
  const formatCurrency = (amount: number, currencyCode = "EUR") => {
    return new Intl.NumberFormat("nl-BE", {
      style: "currency",
      currency: currencyCode,
    }).format(amount) // Remove division by 100
  }

  // Belgium-specific date formatting
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("nl-BE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatAddress = (address: Address) => {
    if (!address) return "No address provided"
    
    const parts = []
    if (address.company) parts.push(address.company)
    if (address.first_name || address.last_name) {
      parts.push(`${address.first_name || ""} ${address.last_name || ""}`.trim())
    }
    if (address.address_1) parts.push(address.address_1)
    if (address.address_2) parts.push(address.address_2)
    if (address.postal_code && address.city) {
      parts.push(`${address.postal_code} ${address.city}`)
    }
    if (address.province) parts.push(address.province)
    if (address.country_code) parts.push(address.country_code.toUpperCase())
    
    return parts.join("\n")
  }

  return (
    <div className="flex w-full flex-col gap-y-3">
      {/* Header Section */}
      <Container>
        <div className="flex items-center gap-4 px-6 py-4">
          <Button size="small" variant="transparent" asChild>
            <Link to="/invoices">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Heading level="h1">{inv.invoice_number}</Heading>
              <StatusBadge color={statusVariants[inv.status as keyof typeof statusVariants]}>
                {inv.status}
              </StatusBadge>
              <StatusBadge color={invoiceTypeVariants[inv.invoice_type as keyof typeof invoiceTypeVariants]}>
                {inv.invoice_type.replace('_', ' ')}
              </StatusBadge>
            </div>
            <Text className="text-ui-fg-subtle">
              {inv.customer 
                ? (inv.customer.company_name || `${inv.customer.first_name} ${inv.customer.last_name}`)
                : inv.customer_email || "No customer"
              }
            </Text>
          </div>
          {/* Header Actions */}
          <div className="flex gap-2">
            <Button size="small" variant="secondary">
              Generate PDF
            </Button>
            <Button size="small" variant="secondary">
              Send Invoice
            </Button>
          </div>
        </div>
      </Container>

      {/* Main Content with TwoColumnPage */}
      <TwoColumnPage
        widgets={{
          before: [],
          after: [],
          sideAfter: [],
          sideBefore: [],
        }}
        data={inv}
        hasOutlet={false}
        showJSON={false}
        showMetadata={false}
      >
        <TwoColumnPage.Main>
          {/* Customer & Address Information */}
          <Container>
            <div className="p-6">
              <Heading level="h2" className="mb-4">Customer & Address Information</Heading>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Information */}
                <div>
                  <Label size="small" weight="plus" className="text-ui-fg-subtle mb-3 block">
                    Customer Information
                  </Label>
                  <div className="space-y-3 p-4 border border-ui-border-base rounded-lg">
                    {inv.customer ? (
                      <>
                        <div>
                          <Label size="xsmall" className="text-ui-fg-muted">Name</Label>
                          <Text size="small" weight="plus">
                            {inv.customer.company_name || `${inv.customer.first_name} ${inv.customer.last_name}`}
                          </Text>
                        </div>
                        <div>
                          <Label size="xsmall" className="text-ui-fg-muted">Email</Label>
                          <Text size="small">{inv.customer.email}</Text>
                        </div>
                        {inv.customer.phone && (
                          <div>
                            <Label size="xsmall" className="text-ui-fg-muted">Phone</Label>
                            <Text size="small">{inv.customer.phone}</Text>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div>
                          <Label size="xsmall" className="text-ui-fg-muted">Email</Label>
                          <Text size="small">{inv.customer_email}</Text>
                        </div>
                        {inv.customer_phone && (
                          <div>
                            <Label size="xsmall" className="text-ui-fg-muted">Phone</Label>
                            <Text size="small">{inv.customer_phone}</Text>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Billing Address */}
                <div>
                  <Label size="small" weight="plus" className="text-ui-fg-subtle mb-3 block">
                    Billing Address
                  </Label>
                  <div className="p-4 border border-ui-border-base rounded-lg">
                    <Text size="small" className="whitespace-pre-line">
                      {formatAddress(inv.billing_address)}
                    </Text>
                  </div>
                </div>

                {/* Shipping Address */}
                {inv.shipping_address && (
                  <div className="md:col-span-1">
                    <Label size="small" weight="plus" className="text-ui-fg-subtle mb-3 block">
                      Shipping Address
                    </Label>
                    <div className="p-4 border border-ui-border-base rounded-lg">
                      <Text size="small" className="whitespace-pre-line">
                        {formatAddress(inv.shipping_address)}
                      </Text>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Container>

          {/* Invoice Line Items */}
          <Container>
            <div className="p-6">
              <Heading level="h2" className="mb-4">Items & Services</Heading>
              
              {inv.line_items && inv.line_items.length > 0 ? (
                <div className="border border-ui-border-base rounded-lg overflow-hidden">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 p-4 bg-ui-bg-subtle border-b border-ui-border-base">
                    <div className="col-span-6">
                      <Label size="small" weight="plus">Product / Service</Label>
                    </div>
                    <div className="col-span-2 text-center">
                      <Label size="small" weight="plus">Quantity</Label>
                    </div>
                    <div className="col-span-2 text-right">
                      <Label size="small" weight="plus">Unit Price</Label>
                    </div>
                    <div className="col-span-2 text-right">
                      <Label size="small" weight="plus">Total</Label>
                    </div>
                  </div>
                  
                  {/* Table Rows */}
                  {inv.line_items.map((item: InvoiceLineItem, index: number) => (
                    <div key={item.id || index} className="grid grid-cols-12 gap-4 p-4 border-b border-ui-border-base last:border-b-0">
                      <div className="col-span-6">
                        <div className="flex items-start gap-3">
                          {item.thumbnail && (
                            <img 
                              src={item.thumbnail} 
                              alt={item.title}
                              className="w-10 h-10 rounded object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <Text size="small" weight="plus">{item.title}</Text>
                            {item.description && (
                              <Text size="xsmall" className="text-ui-fg-subtle mt-1">
                                {item.description}
                              </Text>
                            )}
                            {item.sku && (
                              <Text size="xsmall" className="text-ui-fg-muted mt-1">
                                SKU: {item.sku}
                              </Text>
                            )}
                            {item.variant_title && (
                              <Text size="xsmall" className="text-ui-fg-muted mt-1">
                                Variant: {item.variant_title}
                              </Text>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2 text-center">
                        <Text size="small">{item.quantity}</Text>
                      </div>
                      <div className="col-span-2 text-right">
                        <Text size="small">{formatCurrency(item.unit_price)}</Text>
                      </div>
                      <div className="col-span-2 text-right">
                        <Text size="small" weight="plus">{formatCurrency(item.total_price)}</Text>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center border border-ui-border-base rounded-lg">
                  <Text size="small" className="text-ui-fg-muted">No items in this invoice</Text>
                </div>
              )}
            </div>
          </Container>

          {/* Invoice Totals */}
          <Container>
            <div className="p-6">
              <Heading level="h2" className="mb-4">Invoice Totals</Heading>
              
              <div className="max-w-md ml-auto">
                <div className="space-y-3 p-4 border border-ui-border-base rounded-lg">
                  <div className="flex justify-between">
                    <Text size="small">Subtotal:</Text>
                    <Text size="small">{formatCurrency(inv.subtotal)}</Text>
                  </div>
                  {inv.discount_amount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <Text size="small">Discount:</Text>
                      <Text size="small">-{formatCurrency(inv.discount_amount)}</Text>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <Text size="small">Tax (21%):</Text>
                    <Text size="small">{formatCurrency(inv.tax_amount)}</Text>
                  </div>
                  <div className="flex justify-between border-t border-ui-border-base pt-3">
                    <Text size="small" weight="plus">Total Amount:</Text>
                    <Text size="small" weight="plus" className="text-lg">
                      {formatCurrency(inv.total_amount)}
                    </Text>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </TwoColumnPage.Main>

        <TwoColumnPage.Sidebar>
          {/* Invoice Details */}
          <Container>
            <div className="p-6">
              <Heading level="h2" className="mb-4">Invoice Details</Heading>
              
              <div className="space-y-4">
                <div>
                  <Label size="small" weight="plus" className="text-ui-fg-subtle mb-2 block">Invoice Date</Label>
                  <Text size="small">{formatDate(inv.invoice_date)}</Text>
                </div>

                <div>
                  <Label size="small" weight="plus" className="text-ui-fg-subtle mb-2 block">Due Date</Label>
                  <Text size="small">{formatDate(inv.due_date)}</Text>
                </div>

                <div>
                  <Label size="small" weight="plus" className="text-ui-fg-subtle mb-2 block">Status</Label>
                  <StatusBadge color={statusVariants[inv.status as keyof typeof statusVariants]}>
                    {inv.status}
                  </StatusBadge>
                </div>

                <div>
                  <Label size="small" weight="plus" className="text-ui-fg-subtle mb-2 block">Type</Label>
                  <StatusBadge color={invoiceTypeVariants[inv.invoice_type as keyof typeof invoiceTypeVariants]}>
                    {inv.invoice_type.replace('_', ' ')}
                  </StatusBadge>
                </div>

                {inv.payment_terms && (
                  <div>
                    <Label size="small" weight="plus" className="text-ui-fg-subtle mb-2 block">Payment Terms</Label>
                    <Text size="small">{inv.payment_terms}</Text>
                  </div>
                )}
              </div>
            </div>
          </Container>

          {/* Related Information */}
          <Container>
            <div className="p-6">
              <Heading level="h2" className="mb-4">Related Information</Heading>
              
              <div className="space-y-4">
                {inv.order_id && (
                  <div>
                    <Label size="small" weight="plus" className="text-ui-fg-subtle mb-2 block">Order</Label>
                    <Button size="small" variant="transparent" asChild>
                      <Link to={`/orders/${inv.order_id}`}>
                        View Order
                      </Link>
                    </Button>
                  </div>
                )}

                {inv.service_order_id && (
                  <div>
                    <Label size="small" weight="plus" className="text-ui-fg-subtle mb-2 block">Service Order</Label>
                    <Button size="small" variant="transparent" asChild>
                      <Link to={`/service-orders/${inv.service_order_id}`}>
                        View Service Order
                      </Link>
                    </Button>
                  </div>
                )}

                {inv.notes && (
                  <div>
                    <Label size="small" weight="plus" className="text-ui-fg-subtle mb-2 block">Notes</Label>
                    <Text size="small" className="whitespace-pre-wrap">{inv.notes}</Text>
                  </div>
                )}

                <div>
                  <Label size="small" weight="plus" className="text-ui-fg-subtle mb-2 block">Created</Label>
                  <Text size="small">{formatDate(inv.created_at)}</Text>
                </div>

                <div>
                  <Label size="small" weight="plus" className="text-ui-fg-subtle mb-2 block">Last Updated</Label>
                  <Text size="small">{formatDate(inv.updated_at)}</Text>
                </div>
              </div>
            </div>
          </Container>
        </TwoColumnPage.Sidebar>
      </TwoColumnPage>
    </div>
  )
}

export default InvoiceDetails

// Loader function to fetch invoice data for breadcrumbs
export const loader = async ({ params }: { params: { id: string } }) => {
  try {
    const response = await fetch(`/admin/invoices/${params.id}`)
    if (!response.ok) throw new Error("Failed to fetch invoice")
    const data = await response.json()
    return data.invoice
  } catch (error) {
    console.error("Error loading invoice:", error)
    return null
  }
}

export const config = defineRouteConfig({
  // Invoice detail page configuration
})

// Breadcrumb configuration
export const handle = {
  breadcrumb: ({ data }: { data: any }) => {
    if (data && data.invoice_number) {
      return data.invoice_number
    }
    return "Invoice Details"
  },
} 