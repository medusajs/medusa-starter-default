/**
 * TEM-209: Rentals Admin UI - Detail/Edit View
 *
 * This page displays all rental information and allows editing.
 * Shows customer/machine details, hours tracking, cost calculations, and status management.
 *
 * Reference: Service order detail view structure (src/admin/routes/service-orders/[id]/page.tsx)
 */

import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useParams, useNavigate } from "react-router-dom"
import { useState } from "react"
import {
  Container,
  Heading,
  Text,
  Button,
  StatusBadge,
  Label,
  Input,
  toast,
  DropdownMenu,
  Badge,
  Table,
} from "@medusajs/ui"
import { EllipsisHorizontal, Trash, PencilSquare } from "@medusajs/icons"
import { SingleColumnPageSkeleton } from "../../../components/common/skeleton"
import RentalDepartureWidget from "../../../components/widgets/rental-departure-widget"
import RentalArrivalWidget from "../../../components/widgets/rental-arrival-widget"

// TEM-209: Rental data types based on the rental model (src/modules/rentals/models/rental.ts)
interface Rental {
  id: string
  rental_number: string
  customer_id?: string
  machine_id?: string
  customer?: {
    id: string
    first_name?: string
    last_name?: string
    email: string
    phone?: string
    company_name?: string
  }
  machine?: {
    id: string
    name?: string
    model_number?: string
    serial_number?: string
    brand_name?: string
  }
  status: "draft" | "active" | "completed" | "cancelled"
  rental_type: "hourly" | "daily" | "weekly" | "monthly"
  start_machine_hours?: number
  end_machine_hours?: number
  total_hours_used: number
  hourly_rate: number
  daily_rate?: number
  total_rental_cost: number
  rental_start_date: string
  rental_end_date?: string
  expected_return_date: string
  actual_return_date?: string
  description?: string
  pickup_notes?: string
  return_notes?: string
  internal_notes?: string
  deposit_amount?: number
  deposit_paid: boolean
  status_history?: StatusHistoryEntry[]
  created_at: string
  updated_at: string
}

interface StatusHistoryEntry {
  id: string
  from_status?: string
  to_status: string
  changed_by: string
  reason?: string
  changed_at: string
}

// TEM-209: Data fetching hook for rental details
const useRental = (id: string) => {
  return useQuery({
    queryKey: ["rental", id],
    queryFn: async () => {
      const response = await fetch(`/admin/rentals/${id}`)
      if (!response.ok) throw new Error("Failed to fetch rental")
      const data = await response.json()
      return data.rental as Rental
    },
    enabled: !!id,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  })
}

// TEM-209: End Rental Modal Component - Updates end machine hours
const EndRentalModal = ({
  rental,
  onClose,
}: {
  rental: Rental
  onClose: () => void
}) => {
  const queryClient = useQueryClient()
  const [endHours, setEndHours] = useState<number>(
    rental.end_machine_hours || rental.start_machine_hours || 0
  )

  const updateHoursMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/admin/rentals/${rental.id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ end_machine_hours: endHours }),
      })
      if (!response.ok) throw new Error("Failed to update rental hours")
      return response.json()
    },
    onSuccess: () => {
      toast.success("Rental hours updated")
      queryClient.invalidateQueries({ queryKey: ["rental", rental.id] })
      onClose()
    },
    onError: (error: Error) => {
      toast.error(`Failed to update hours: ${error.message}`)
    },
  })

  const handleSave = () => {
    updateHoursMutation.mutate()
  }

  // TEM-209: Calculate hours used and total cost
  const hoursUsed = endHours - (rental.start_machine_hours || 0)
  const totalCost = hoursUsed * (rental.hourly_rate / 100)

  return (
    <div className="space-y-4">
      <Heading level="h2">End Rental</Heading>
      <div className="space-y-4">
        <div>
          <Label htmlFor="endHours">End Machine Hours</Label>
          <Input
            id="endHours"
            type="number"
            value={endHours}
            onChange={(e) => setEndHours(Number(e.target.value))}
            min={rental.start_machine_hours || 0}
          />
        </div>
        <div className="space-y-2 p-4 bg-ui-bg-subtle rounded-md">
          <Text weight="plus">Hours Used: {hoursUsed}</Text>
          <Text weight="plus">
            Total Cost: €{totalCost.toFixed(2)}
          </Text>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            isLoading={updateHoursMutation.isPending}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}

const RentalDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showEndHoursModal, setShowEndHoursModal] = useState(false)

  // TEM-209: Fetch rental data
  const { data: rental, isLoading, error } = useRental(id!)

  // TEM-209: Generate Invoice mutation
  const generateInvoiceMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/admin/rentals/${id}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!response.ok) throw new Error("Failed to generate invoice")
      return response.json()
    },
    onSuccess: (data) => {
      toast.success("Invoice generated successfully")
      // Navigate to invoice page if available
      if (data.invoice?.id) {
        navigate(`/invoices/${data.invoice.id}`)
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate invoice: ${error.message}`)
    },
  })

  // TEM-209: Delete rental mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/admin/rentals/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete rental")
      return response.json()
    },
    onSuccess: () => {
      toast.success("Rental deleted successfully")
      navigate("/rentals")
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete rental: ${error.message}`)
    },
  })

  if (isLoading || !rental) {
    return <SingleColumnPageSkeleton sections={3} showJSON showMetadata />
  }

  if (error) {
    throw error
  }

  // TEM-209: Status badge helper
  const getStatusBadge = (status: string) => {
    const statusVariants = {
      draft: { color: "orange" as const, label: "Draft" },
      active: { color: "green" as const, label: "Active" },
      completed: { color: "blue" as const, label: "Completed" },
      cancelled: { color: "red" as const, label: "Cancelled" },
    }

    const config = statusVariants[status as keyof typeof statusVariants] || {
      color: "grey" as const,
      label: status,
    }

    return <StatusBadge color={config.color}>{config.label}</StatusBadge>
  }

  // TEM-209: Format date helper
  const formatDate = (date?: string) => {
    if (!date) return "—"
    return new Date(date).toLocaleDateString()
  }

  // TEM-209: Format status history
  const statusHistory = rental.status_history || []
  const sortedHistory = [...statusHistory].sort(
    (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
  )

  const getStatusColor = (
    status: string
  ): "red" | "orange" | "blue" | "green" | "purple" | "grey" => {
    const statusColors = {
      draft: "orange",
      active: "green",
      completed: "blue",
      cancelled: "red",
    } as const

    return statusColors[status as keyof typeof statusColors] || "grey"
  }

  // TEM-209: Handle actions
  const handleEndRental = () => {
    setShowEndHoursModal(true)
  }

  const handleGenerateInvoice = () => {
    if (
      !rental.end_machine_hours ||
      !rental.total_hours_used ||
      rental.status !== "completed"
    ) {
      toast.error(
        "Rental must be completed with end hours set before generating invoice"
      )
      return
    }
    generateInvoiceMutation.mutate()
  }

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this rental?")) {
      deleteMutation.mutate()
    }
  }

  return (
    <div className="flex flex-col gap-y-2">
      {/* TEM-209: Header Section - rental number, status, and action buttons */}
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Heading level="h1">{rental.rental_number}</Heading>
            {getStatusBadge(rental.status)}
          </div>
          <div className="flex gap-2">
            {/* TEM-209: End Rental button - shown when rental is active and no end hours */}
            {rental.status === "active" && !rental.end_machine_hours && (
              <Button onClick={handleEndRental}>End Rental</Button>
            )}
            {/* TEM-209: Generate Invoice button - shown when rental is completed */}
            {rental.status === "completed" &&
              rental.end_machine_hours &&
              rental.total_hours_used > 0 && (
                <Button
                  onClick={handleGenerateInvoice}
                  isLoading={generateInvoiceMutation.isPending}
                >
                  Generate Invoice
                </Button>
              )}
            {/* TEM-209: Dropdown menu for additional actions */}
            <DropdownMenu>
              <DropdownMenu.Trigger asChild>
                <Button variant="secondary">
                  <EllipsisHorizontal />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item className="gap-x-2" onClick={() => navigate(`/rentals/${rental.id}/edit`)}>
                  <PencilSquare className="text-ui-fg-subtle" />
                  Edit Details
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item
                  className="gap-x-2"
                  onClick={handleDelete}
                >
                  <Trash className="text-ui-fg-subtle" />
                  Delete Rental
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu>
          </div>
        </div>
      </Container>

      {/* TEM-209: Customer & Machine Section - two column grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* TEM-209: Customer Information */}
        <Container className="divide-y p-0">
          <div className="px-6 py-4">
            <Heading level="h2">Customer</Heading>
          </div>
          <div className="px-6 py-4">
            {rental.customer ? (
              <div className="space-y-2">
                <Text weight="plus">
                  {rental.customer.first_name && rental.customer.last_name
                    ? `${rental.customer.first_name} ${rental.customer.last_name}`
                    : rental.customer.email}
                </Text>
                {rental.customer.company_name && (
                  <Text className="text-ui-fg-subtle">
                    {rental.customer.company_name}
                  </Text>
                )}
                <Text className="text-ui-fg-subtle">
                  {rental.customer.email}
                </Text>
                {rental.customer.phone && (
                  <Text className="text-ui-fg-subtle">
                    {rental.customer.phone}
                  </Text>
                )}
              </div>
            ) : (
              <Text className="text-ui-fg-muted">No customer assigned</Text>
            )}
          </div>
        </Container>

        {/* TEM-209: Machine Information */}
        <Container className="divide-y p-0">
          <div className="px-6 py-4">
            <Heading level="h2">Machine</Heading>
          </div>
          <div className="px-6 py-4">
            {rental.machine ? (
              <div className="space-y-2">
                <Text weight="plus">
                  {rental.machine.name || rental.machine.model_number}
                </Text>
                {rental.machine.brand_name && (
                  <Text className="text-ui-fg-subtle">
                    Brand: {rental.machine.brand_name}
                  </Text>
                )}
                {rental.machine.serial_number && (
                  <Text className="text-ui-fg-subtle">
                    Serial: {rental.machine.serial_number}
                  </Text>
                )}
                {rental.machine.model_number && (
                  <Text className="text-ui-fg-subtle">
                    Model: {rental.machine.model_number}
                  </Text>
                )}
              </div>
            ) : (
              <Text className="text-ui-fg-muted">No machine assigned</Text>
            )}
          </div>
        </Container>
      </div>

      {/* TEM-209: Departure & Arrival Section - two column grid */}
      <div className="grid grid-cols-2 gap-4">
        <RentalDepartureWidget
          data={{
            rental_start_date: rental.rental_start_date,
            start_machine_hours: rental.start_machine_hours,
            pickup_notes: rental.pickup_notes,
            status: rental.status,
          }}
        />
        <RentalArrivalWidget
          data={{
            expected_return_date: rental.expected_return_date,
            actual_return_date: rental.actual_return_date,
            end_machine_hours: rental.end_machine_hours,
            return_notes: rental.return_notes,
            status: rental.status,
            total_hours_used: rental.total_hours_used,
          }}
          onSetEndHours={() => setShowEndHoursModal(true)}
        />
      </div>

      {/* TEM-209: Rental Details Section - type and description */}
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Rental Details</Heading>
        </div>
        <div className="px-6 py-4">
          <div className="space-y-4">
            <div>
              <Label size="small" weight="plus">
                Rental Type
              </Label>
              <Text>
                {rental.rental_type.charAt(0).toUpperCase() +
                  rental.rental_type.slice(1)}
              </Text>
            </div>
            {rental.description && (
              <div>
                <Label size="small" weight="plus">
                  Description
                </Label>
                <Text>{rental.description}</Text>
              </div>
            )}
            {rental.internal_notes && (
              <div>
                <Label size="small" weight="plus">
                  Internal Notes
                </Label>
                <div className="bg-ui-bg-subtle rounded-md p-3">
                  <Text size="small" className="whitespace-pre-wrap">
                    {rental.internal_notes}
                  </Text>
                </div>
              </div>
            )}
          </div>
        </div>
      </Container>

      {/* TEM-209: Cost Breakdown Section */}
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Cost Breakdown</Heading>
        </div>
        <div className="px-6 py-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Text>Hours Used</Text>
              <Text>{rental.total_hours_used || 0} hours</Text>
            </div>
            <div className="flex justify-between">
              <Text>Rate</Text>
              <Text>€{(rental.hourly_rate / 100).toFixed(2)} / hour</Text>
            </div>
            {rental.deposit_amount && (
              <div className="flex justify-between">
                <Text>Deposit Amount</Text>
                <Text>
                  €{(rental.deposit_amount / 100).toFixed(2)}{" "}
                  {rental.deposit_paid && (
                    <Badge color="green" size="2xsmall">
                      Paid
                    </Badge>
                  )}
                </Text>
              </div>
            )}
            <div className="flex justify-between border-t pt-2">
              <Text weight="plus">Total Rental Cost</Text>
              <Text weight="plus" className="text-2xl">
                €{(rental.total_rental_cost / 100).toFixed(2)}
              </Text>
            </div>
          </div>
        </div>
      </Container>

      {/* TEM-209: Status History Section */}
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Heading level="h2">Status History</Heading>
              <Text size="small" className="text-ui-fg-subtle">
                {statusHistory.length} status change
                {statusHistory.length !== 1 ? "s" : ""} recorded
              </Text>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          {sortedHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Text className="text-ui-fg-muted mb-2">
                No status changes recorded
              </Text>
              <Text size="small" className="text-ui-fg-subtle">
                Status changes will appear here as they occur
              </Text>
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>
                    <Label size="small" weight="plus">
                      From
                    </Label>
                  </Table.HeaderCell>
                  <Table.HeaderCell>
                    <Label size="small" weight="plus">
                      To
                    </Label>
                  </Table.HeaderCell>
                  <Table.HeaderCell>
                    <Label size="small" weight="plus">
                      Changed By
                    </Label>
                  </Table.HeaderCell>
                  <Table.HeaderCell>
                    <Label size="small" weight="plus">
                      Reason
                    </Label>
                  </Table.HeaderCell>
                  <Table.HeaderCell>
                    <Label size="small" weight="plus">
                      Date
                    </Label>
                  </Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {sortedHistory.map((history: StatusHistoryEntry) => (
                  <Table.Row key={history.id}>
                    <Table.Cell>
                      {history.from_status ? (
                        <Badge
                          size="2xsmall"
                          color={getStatusColor(history.from_status)}
                        >
                          {history.from_status.replace("_", " ")}
                        </Badge>
                      ) : (
                        <Text size="small" className="text-ui-fg-muted">
                          -
                        </Text>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge
                        size="2xsmall"
                        color={getStatusColor(history.to_status)}
                      >
                        {history.to_status.replace("_", " ")}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small">{history.changed_by}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text
                        size="small"
                        className={history.reason ? "" : "text-ui-fg-muted"}
                      >
                        {history.reason || "No reason provided"}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-subtle">
                        {new Date(history.changed_at).toLocaleString()}
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </div>
      </Container>

      {/* TEM-209: End Rental Modal */}
      {showEndHoursModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ui-bg-overlay">
          <div className="bg-ui-bg-base p-6 rounded-lg shadow-lg max-w-md w-full">
            <EndRentalModal
              rental={rental}
              onClose={() => setShowEndHoursModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default RentalDetails

// TEM-209: Loader function to fetch rental data for breadcrumbs
export const loader = async ({ params }: { params: { id: string } }) => {
  try {
    const response = await fetch(`/admin/rentals/${params.id}`)
    if (!response.ok) throw new Error("Failed to fetch rental")
    const data = await response.json()
    return data.rental
  } catch (error) {
    console.error("Error loading rental:", error)
    return null
  }
}

export const config = defineRouteConfig({
  label: "Rental Details",
})

// TEM-209: Breadcrumb configuration
export const handle = {
  breadcrumb: ({ data }: { data: any }) => {
    if (data && data.rental_number) {
      return data.rental_number
    }
    return "Rental Details"
  },
}
