import React from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowLeft, Calendar, TruckFast, ExclamationCircle } from "@medusajs/icons"
import { 
  Container, 
  Heading, 
  Button, 
  Badge, 
  Text,
  StatusBadge,
  toast
} from "@medusajs/ui"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface RentalDetail {
  id: string
  rental_order_number: string
  customer_id: string
  machine_id: string
  machine?: {
    id: string
    model_number: string
    serial_number: string
    machine_type: string
    brand_id?: string
  } | null
  rental_type: "short_term" | "long_term" | "trial"
  status: "draft" | "confirmed" | "active" | "returned" | "overdue" | "cancelled"
  start_date: string
  end_date: string
  actual_return_date?: string | null
  daily_rate: number
  weekly_rate?: number | null
  monthly_rate?: number | null
  security_deposit: number
  total_rental_cost: number
  additional_charges: number
  delivery_required: boolean
  delivery_address_line_1?: string | null
  delivery_address_line_2?: string | null
  delivery_city?: string | null
  delivery_postal_code?: string | null
  delivery_country?: string | null
  delivery_cost: number
  pickup_required: boolean
  pickup_address_line_1?: string | null
  pickup_address_line_2?: string | null
  pickup_city?: string | null
  pickup_postal_code?: string | null
  pickup_country?: string | null
  pickup_cost: number
  condition_on_delivery?: string | null
  condition_on_return?: string | null
  damage_notes?: string | null
  terms_and_conditions?: string | null
  special_instructions?: string | null
  insurance_required: boolean
  insurance_cost: number
  billing_cycle: "daily" | "weekly" | "monthly"
  payment_terms?: string | null
  late_fee_percentage: number
  notes?: string | null
  internal_notes?: string | null
  created_at: string
  updated_at: string
}

const useRental = (id: string) => {
  return useQuery({
    queryKey: ["rental", id],
    queryFn: async () => {
      const response = await fetch(`/admin/rentals/${id}`)
      if (!response.ok) {
        throw new Error("Failed to fetch rental")
      }
      const data = await response.json()
      return data.rental as RentalDetail
    },
  })
}

const useUpdateRentalStatus = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const response = await fetch(`/admin/rentals/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status, reason }),
      })
      
      if (!response.ok) {
        throw new Error("Failed to update rental status")
      }
      
      return response.json()
    },
    onSuccess: (_, variables) => {
      toast.success("Rental status updated successfully")
      queryClient.invalidateQueries({ queryKey: ["rental", variables.id] })
      queryClient.invalidateQueries({ queryKey: ["rentals"] })
    },
    onError: () => {
      toast.error("Failed to update rental status")
    },
  })
}

const useReturnRental = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, returnData }: { 
      id: string; 
      returnData: {
        condition_on_return?: string
        damage_notes?: string
        additional_charges?: number
      }
    }) => {
      const response = await fetch(`/admin/rentals/${id}/return`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(returnData),
      })
      
      if (!response.ok) {
        throw new Error("Failed to return rental")
      }
      
      return response.json()
    },
    onSuccess: (_, variables) => {
      toast.success("Rental returned successfully")
      queryClient.invalidateQueries({ queryKey: ["rental", variables.id] })
      queryClient.invalidateQueries({ queryKey: ["rentals"] })
    },
    onError: () => {
      toast.error("Failed to return rental")
    },
  })
}

const RentalDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: rental, isLoading, error } = useRental(id!)
  const updateStatusMutation = useUpdateRentalStatus()
  const returnRentalMutation = useReturnRental()

  if (!id) {
    return <Text>Invalid rental ID</Text>
  }

  if (error) {
    throw error
  }

  if (isLoading) {
    return (
      <Container className="p-6">
        <div className="flex items-center justify-center h-32">
          <Text className="text-ui-fg-subtle">Loading rental...</Text>
        </div>
      </Container>
    )
  }

  if (!rental) {
    return <Text>Rental not found</Text>
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: "grey" as const, label: "Draft" },
      confirmed: { color: "blue" as const, label: "Confirmed" },
      active: { color: "green" as const, label: "Active" },
      returned: { color: "purple" as const, label: "Returned" },
      overdue: { color: "red" as const, label: "Overdue" },
      cancelled: { color: "red" as const, label: "Cancelled" },
    } as const

    const config = statusConfig[status as keyof typeof statusConfig] || { color: "grey" as const, label: status }
    
    return (
      <StatusBadge color={config.color}>
        {config.label}
      </StatusBadge>
    )
  }

  const handleStatusUpdate = (status: string) => {
    updateStatusMutation.mutate({
      id: rental.id,
      status,
      reason: `Status changed to ${status}`,
    })
  }

  const handleReturn = () => {
    const condition = prompt("Enter condition on return:")
    const damageNotes = prompt("Enter any damage notes (optional):")
    const additionalChargesStr = prompt("Enter additional charges (optional):")
    const additionalCharges = additionalChargesStr ? parseFloat(additionalChargesStr) : 0

    returnRentalMutation.mutate({
      id: rental.id,
      returnData: {
        condition_on_return: condition || undefined,
        damage_notes: damageNotes || undefined,
        additional_charges: additionalCharges,
      },
    })
  }

  const formatAddress = (
    line1?: string | null,
    line2?: string | null,
    city?: string | null,
    postal?: string | null,
    country?: string | null
  ) => {
    const parts = [line1, line2, city, postal, country].filter(Boolean)
    return parts.length > 0 ? parts.join(", ") : "—"
  }

  return (
    <Container className="divide-y p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="transparent"
            size="small"
            onClick={() => navigate("/rentals")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Rentals
          </Button>
          <div>
            <Heading>{rental.rental_order_number}</Heading>
            <Text className="text-ui-fg-subtle" size="small">
              Rental Details
            </Text>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(rental.status)}
          {rental.status === "confirmed" && (
            <Button size="small" onClick={() => handleStatusUpdate("active")}>
              Mark as Active
            </Button>
          )}
          {rental.status === "active" && (
            <Button size="small" onClick={handleReturn}>
              Process Return
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rental Information */}
          <Container className="p-6 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5" />
              <Heading level="h3">Rental Information</Heading>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Text size="small" className="text-ui-fg-subtle">Machine</Text>
                <Text className="font-medium">
                  {rental.machine?.model_number || "Unknown"}
                </Text>
                <Text size="small" className="text-ui-fg-subtle">
                  {rental.machine?.serial_number}
                </Text>
              </div>
              <div>
                <Text size="small" className="text-ui-fg-subtle">Rental Type</Text>
                <Badge color="grey">
                  {rental.rental_type.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              </div>
              <div>
                <Text size="small" className="text-ui-fg-subtle">Start Date</Text>
                <Text>{new Date(rental.start_date).toLocaleDateString()}</Text>
              </div>
              <div>
                <Text size="small" className="text-ui-fg-subtle">End Date</Text>
                <Text>{new Date(rental.end_date).toLocaleDateString()}</Text>
              </div>
              {rental.actual_return_date && (
                <div>
                  <Text size="small" className="text-ui-fg-subtle">Actual Return</Text>
                  <Text>{new Date(rental.actual_return_date).toLocaleDateString()}</Text>
                </div>
              )}
            </div>
          </Container>

          {/* Financial Information */}
          <Container className="p-6 rounded-lg shadow-sm">
            <Heading level="h3" className="mb-4">Financial Details</Heading>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Text size="small" className="text-ui-fg-subtle">Daily Rate</Text>
                <Text className="font-medium">${rental.daily_rate.toFixed(2)}</Text>
              </div>
              {rental.weekly_rate && (
                <div>
                  <Text size="small" className="text-ui-fg-subtle">Weekly Rate</Text>
                  <Text>${rental.weekly_rate.toFixed(2)}</Text>
                </div>
              )}
              <div>
                <Text size="small" className="text-ui-fg-subtle">Security Deposit</Text>
                <Text>${rental.security_deposit.toFixed(2)}</Text>
              </div>
              <div>
                <Text size="small" className="text-ui-fg-subtle">Total Cost</Text>
                <Text className="font-medium text-lg">${rental.total_rental_cost.toFixed(2)}</Text>
              </div>
              {rental.additional_charges > 0 && (
                <div>
                  <Text size="small" className="text-ui-fg-subtle">Additional Charges</Text>
                  <Text className="text-ui-fg-error">${rental.additional_charges.toFixed(2)}</Text>
                </div>
              )}
            </div>
          </Container>

          {/* Delivery Information */}
          {(rental.delivery_required || rental.pickup_required) && (
            <Container className="p-6 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <TruckFast className="h-5 w-5" />
                <Heading level="h3">Delivery & Pickup</Heading>
              </div>
              {rental.delivery_required && (
                <div className="mb-4">
                  <Text size="small" className="text-ui-fg-subtle">Delivery Address</Text>
                  <Text>{formatAddress(
                    rental.delivery_address_line_1,
                    rental.delivery_address_line_2,
                    rental.delivery_city,
                    rental.delivery_postal_code,
                    rental.delivery_country
                  )}</Text>
                  <Text size="small" className="text-ui-fg-subtle">Cost: ${rental.delivery_cost.toFixed(2)}</Text>
                </div>
              )}
              {rental.pickup_required && (
                <div>
                  <Text size="small" className="text-ui-fg-subtle">Pickup Address</Text>
                  <Text>{formatAddress(
                    rental.pickup_address_line_1,
                    rental.pickup_address_line_2,
                    rental.pickup_city,
                    rental.pickup_postal_code,
                    rental.pickup_country
                  )}</Text>
                  <Text size="small" className="text-ui-fg-subtle">Cost: ${rental.pickup_cost.toFixed(2)}</Text>
                </div>
              )}
            </Container>
          )}

          {/* Condition & Notes */}
          {(rental.condition_on_delivery || rental.condition_on_return || rental.damage_notes || rental.notes) && (
            <Container className="p-6 rounded-lg shadow-sm">
              <Heading level="h3" className="mb-4">Condition & Notes</Heading>
              <div className="space-y-4">
                {rental.condition_on_delivery && (
                  <div>
                    <Text size="small" className="text-ui-fg-subtle">Condition on Delivery</Text>
                    <Text>{rental.condition_on_delivery}</Text>
                  </div>
                )}
                {rental.condition_on_return && (
                  <div>
                    <Text size="small" className="text-ui-fg-subtle">Condition on Return</Text>
                    <Text>{rental.condition_on_return}</Text>
                  </div>
                )}
                {rental.damage_notes && (
                  <div>
                    <div className="flex items-center gap-2">
                      <ExclamationCircle className="h-4 w-4 text-ui-fg-error" />
                      <Text size="small" className="text-ui-fg-subtle">Damage Notes</Text>
                    </div>
                    <Text className="text-ui-fg-error">{rental.damage_notes}</Text>
                  </div>
                )}
                {rental.notes && (
                  <div>
                    <Text size="small" className="text-ui-fg-subtle">Notes</Text>
                    <Text>{rental.notes}</Text>
                  </div>
                )}
              </div>
            </Container>
          )}
        </div>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Rental Details",
})

export default RentalDetailPage