import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowLeft, ShieldCheck, Buildings, User, Clock, CheckCircleSolid, ReceiptPercent, XCircle } from "@medusajs/icons"
import { Button, Heading, StatusBadge, Text, Container, Label, Badge } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { TwoColumnPage } from "../../../components/layout/pages"
import { SingleColumnPageSkeleton } from "../../../components/common/skeleton"

// Types for warranty data
interface Customer {
  id: string
  first_name: string
  last_name: string
  company_name?: string
  email: string
  phone?: string
}

interface Machine {
  id: string
  model_number: string
  serial_number: string
  brand: string
  year?: number
  engine_hours?: number
}

interface ServiceOrder {
  id: string
  service_order_number: string
  service_type: string
  status: string
  priority: string
}

interface WarrantyLineItem {
  id: string
  item_type: "labor" | "product" | "shipping" | "adjustment"
  title: string
  description?: string
  sku?: string
  quantity: number
  unit_price: number
  total_amount: number
  tax_rate: number
  tax_amount: number
  hours_worked?: number
  hourly_rate?: number
  product_id?: string
  variant_id?: string
  is_reimbursable: boolean
  reimbursement_amount: number
  reimbursement_reference?: string
}

interface WarrantyStatusHistory {
  id: string
  from_status?: string
  to_status: string
  changed_by?: string
  change_reason?: string
  notes?: string
  external_reference?: string
  approval_number?: string
  created_at: string
}

interface Warranty {
  id: string
  warranty_number: string
  warranty_type: "manufacturer" | "supplier" | "extended" | "goodwill"
  status: "draft" | "submitted" | "approved" | "reimbursed" | "rejected" | "closed"
  warranty_claim_number?: string
  warranty_provider?: string
  claim_reference?: string
  labor_cost: number
  parts_cost: number
  total_cost: number
  reimbursement_amount: number
  currency_code: string
  warranty_start_date?: string
  warranty_end_date?: string
  claim_date?: string
  approval_date?: string
  reimbursement_date?: string
  description?: string
  failure_description?: string
  repair_description?: string
  notes?: string
  internal_notes?: string
  service_order_id: string
  customer_id?: string
  machine_id?: string
  customer?: Customer
  machine?: Machine
  service_order?: ServiceOrder
  line_items?: WarrantyLineItem[]
  status_history?: WarrantyStatusHistory[]
  created_at: string
  updated_at: string
}

const WarrantyDetails = () => {
  const { id } = useParams()

  const { data: warranty, isLoading, error } = useQuery({
    queryKey: ["warranty", id],
    queryFn: async () => {
      const response = await fetch(`/admin/warranties/${id}`)
      if (!response.ok) throw new Error("Failed to fetch warranty")
      return response.json()
    },
    enabled: !!id,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  })

  if (isLoading || !warranty) {
    return <SingleColumnPageSkeleton sections={3} showJSON showMetadata />
  }

  if (error) {
    throw error
  }

  // Format currency for Belgian locale
  const formatCurrency = (amount: number, currencyCode = "EUR") => {
    return new Intl.NumberFormat("nl-BE", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(amount)
  }

  // Format date for Belgian locale
  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("nl-BE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(date))
  }

  // Status badge component
  const WarrantyStatusBadge = ({ status }: { status: Warranty["status"] }) => {
    const statusConfig = {
      draft: { color: "grey" as const, icon: Clock, label: "Draft" },
      submitted: { color: "blue" as const, icon: Clock, label: "Submitted" },
      approved: { color: "green" as const, icon: CheckCircleSolid, label: "Approved" },
      reimbursed: { color: "green" as const, icon: ReceiptPercent, label: "Reimbursed" },
      rejected: { color: "red" as const, icon: XCircle, label: "Rejected" },
      closed: { color: "grey" as const, icon: Clock, label: "Closed" }
    }

    const config = statusConfig[status]
    const Icon = config.icon

    return (
      <StatusBadge color={config.color} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </StatusBadge>
    )
  }

  // Warranty type badge component
  const WarrantyTypeBadge = ({ type }: { type: Warranty["warranty_type"] }) => {
    const typeConfig = {
      manufacturer: { color: "blue" as const, icon: Buildings, label: "Manufacturer" },
      supplier: { color: "orange" as const, icon: Buildings, label: "Supplier" },
      extended: { color: "purple" as const, icon: ShieldCheck, label: "Extended" },
      goodwill: { color: "green" as const, icon: ShieldCheck, label: "Goodwill" }
    }

    const config = typeConfig[type]
    const Icon = config.icon

    return (
      <StatusBadge color={config.color} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </StatusBadge>
    )
  }

  return (
    <TwoColumnPage
      widgets={{
        before: [],
        after: [],
        sideAfter: [],
        sideBefore: [],
      }}
      data={warranty}
      hasOutlet={false}
      showJSON={false}
      showMetadata={false}
    >
      <div className="flex items-center gap-2 mb-6">
        <Button size="small" variant="transparent" asChild>
          <Link to="/warranties">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Warranties
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading level="h1">{warranty.warranty_number}</Heading>
          <div className="flex items-center gap-2 mt-2">
            <WarrantyTypeBadge type={warranty.warranty_type} />
            <WarrantyStatusBadge status={warranty.status} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="small" variant="secondary">
            Edit Warranty
          </Button>
        </div>
      </div>

      <TwoColumnPage.Main>
        <div className="space-y-6">
          {/* Customer Information */}
          {warranty.customer && (
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4" />
                <Heading level="h2">Customer Information</Heading>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label size="small" weight="plus">Name</Label>
                  <Text size="small">
                    {warranty.customer.company_name || `${warranty.customer.first_name} ${warranty.customer.last_name}`}
                  </Text>
                </div>
                <div>
                  <Label size="small" weight="plus">Email</Label>
                  <Text size="small">{warranty.customer.email}</Text>
                </div>
                {warranty.customer.phone && (
                  <div>
                    <Label size="small" weight="plus">Phone</Label>
                    <Text size="small">{warranty.customer.phone}</Text>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Machine Information */}
          {warranty.machine && (
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Buildings className="w-4 h-4" />
                <Heading level="h2">Machine Information</Heading>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label size="small" weight="plus">Brand & Model</Label>
                  <Text size="small">{warranty.machine.brand} {warranty.machine.model_number}</Text>
                </div>
                <div>
                  <Label size="small" weight="plus">Serial Number</Label>
                  <Text size="small">{warranty.machine.serial_number}</Text>
                </div>
                {warranty.machine.year && (
                  <div>
                    <Label size="small" weight="plus">Year</Label>
                    <Text size="small">{warranty.machine.year}</Text>
                  </div>
                )}
                {warranty.machine.engine_hours && (
                  <div>
                    <Label size="small" weight="plus">Engine Hours</Label>
                    <Text size="small">{warranty.machine.engine_hours}</Text>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Service Order Information */}
          {warranty.service_order && (
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-4 h-4" />
                <Heading level="h2">Service Order</Heading>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label size="small" weight="plus">Service Order Number</Label>
                  <Text size="small">{warranty.service_order.service_order_number}</Text>
                </div>
                <div>
                  <Label size="small" weight="plus">Service Type</Label>
                  <Text size="small">{warranty.service_order.service_type}</Text>
                </div>
                <div>
                  <Label size="small" weight="plus">Status</Label>
                  <Text size="small">{warranty.service_order.status}</Text>
                </div>
                <div>
                  <Label size="small" weight="plus">Priority</Label>
                  <Text size="small">{warranty.service_order.priority}</Text>
                </div>
              </div>
            </div>
          )}

          {/* Line Items */}
          {warranty.line_items && warranty.line_items.length > 0 && (
            <div className="bg-white rounded-lg border p-6">
              <Heading level="h2" className="mb-4">Line Items</Heading>
              <div className="space-y-3">
                {warranty.line_items.map((item: WarrantyLineItem) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex-1">
                      <Text size="small" weight="plus">{item.title}</Text>
                      {item.description && (
                        <Text size="xsmall" className="text-ui-fg-subtle">{item.description}</Text>
                      )}
                      <div className="flex items-center gap-4 mt-1">
                        <Text size="xsmall">Qty: {item.quantity}</Text>
                        <Text size="xsmall">Rate: {formatCurrency(item.unit_price)}</Text>
                        {item.hours_worked && (
                          <Text size="xsmall">Hours: {item.hours_worked}</Text>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Text size="small" weight="plus">{formatCurrency(item.total_amount)}</Text>
                      {item.reimbursement_amount > 0 && (
                        <Text size="xsmall" className="text-green-600">
                          Reimbursed: {formatCurrency(item.reimbursement_amount)}
                        </Text>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status History */}
          {warranty.status_history && warranty.status_history.length > 0 && (
            <div className="bg-white rounded-lg border p-6">
              <Heading level="h2" className="mb-4">Status History</Heading>
              <div className="space-y-3">
                {warranty.status_history.map((history: WarrantyStatusHistory) => (
                  <div key={history.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <WarrantyStatusBadge status={history.to_status as Warranty["status"]} />
                        <Text size="xsmall" className="text-ui-fg-subtle">
                          {formatDate(history.created_at)}
                        </Text>
                      </div>
                      {history.change_reason && (
                        <Text size="small">{history.change_reason}</Text>
                      )}
                      {history.notes && (
                        <Text size="xsmall" className="text-ui-fg-subtle">{history.notes}</Text>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </TwoColumnPage.Main>

      <TwoColumnPage.Sidebar>
        <div className="space-y-6">
          {/* Warranty Details */}
          <div className="bg-white rounded-lg border p-6">
            <Heading level="h2" className="mb-4">Warranty Details</Heading>
            <div className="space-y-3">
              <div>
                <Label size="small" weight="plus">Claim Number</Label>
                <Text size="small">{warranty.warranty_claim_number || "-"}</Text>
              </div>
              <div>
                <Label size="small" weight="plus">Provider</Label>
                <Text size="small">{warranty.warranty_provider || "-"}</Text>
              </div>
              <div>
                <Label size="small" weight="plus">Claim Reference</Label>
                <Text size="small">{warranty.claim_reference || "-"}</Text>
              </div>
              <div>
                <Label size="small" weight="plus">Claim Date</Label>
                <Text size="small">{warranty.claim_date ? formatDate(warranty.claim_date) : "-"}</Text>
              </div>
              <div>
                <Label size="small" weight="plus">Approval Date</Label>
                <Text size="small">{warranty.approval_date ? formatDate(warranty.approval_date) : "-"}</Text>
              </div>
              <div>
                <Label size="small" weight="plus">Reimbursement Date</Label>
                <Text size="small">{warranty.reimbursement_date ? formatDate(warranty.reimbursement_date) : "-"}</Text>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-white rounded-lg border p-6">
            <Heading level="h2" className="mb-4">Financial Summary</Heading>
            <div className="space-y-3">
              <div className="flex justify-between">
                <Text size="small">Labor Cost</Text>
                <Text size="small" weight="plus">{formatCurrency(warranty.labor_cost)}</Text>
              </div>
              <div className="flex justify-between">
                <Text size="small">Parts Cost</Text>
                <Text size="small" weight="plus">{formatCurrency(warranty.parts_cost)}</Text>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <Text size="small" weight="plus">Total Cost</Text>
                  <Text size="small" weight="plus">{formatCurrency(warranty.total_cost)}</Text>
                </div>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <Text size="small">Reimbursed</Text>
                  <Text size="small" weight="plus" className="text-green-600">
                    {formatCurrency(warranty.reimbursement_amount)}
                  </Text>
                </div>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="bg-white rounded-lg border p-6">
            <Heading level="h2" className="mb-4">Important Dates</Heading>
            <div className="space-y-3">
              <div>
                <Label size="small" weight="plus">Warranty Start</Label>
                <Text size="small">{warranty.warranty_start_date ? formatDate(warranty.warranty_start_date) : "-"}</Text>
              </div>
              <div>
                <Label size="small" weight="plus">Warranty End</Label>
                <Text size="small">{warranty.warranty_end_date ? formatDate(warranty.warranty_end_date) : "-"}</Text>
              </div>
              <div>
                <Label size="small" weight="plus">Created</Label>
                <Text size="small">{formatDate(warranty.created_at)}</Text>
              </div>
              <div>
                <Label size="small" weight="plus">Updated</Label>
                <Text size="small">{formatDate(warranty.updated_at)}</Text>
              </div>
            </div>
          </div>

          {/* Notes */}
          {(warranty.description || warranty.failure_description || warranty.repair_description || warranty.notes) && (
            <div className="bg-white rounded-lg border p-6">
              <Heading level="h2" className="mb-4">Notes</Heading>
              <div className="space-y-3">
                {warranty.description && (
                  <div>
                    <Label size="small" weight="plus">Description</Label>
                    <Text size="small">{warranty.description}</Text>
                  </div>
                )}
                {warranty.failure_description && (
                  <div>
                    <Label size="small" weight="plus">Failure Description</Label>
                    <Text size="small">{warranty.failure_description}</Text>
                  </div>
                )}
                {warranty.repair_description && (
                  <div>
                    <Label size="small" weight="plus">Repair Description</Label>
                    <Text size="small">{warranty.repair_description}</Text>
                  </div>
                )}
                {warranty.notes && (
                  <div>
                    <Label size="small" weight="plus">Notes</Label>
                    <Text size="small">{warranty.notes}</Text>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </TwoColumnPage.Sidebar>
    </TwoColumnPage>
  )
}

export const config = defineRouteConfig({
  label: "Warranty Details",
  icon: ShieldCheck,
})

export default WarrantyDetails 