import { StatusBadge, Text, Select, toast } from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Container } from "../common/container"
import { Header } from "../common/header"
import { SectionRow } from "../common/section-row"

interface PurchaseOrderTimelineProps {
  data: {
    id: string
    status: string
    order_date?: Date | string
    expected_delivery_date?: Date | string
    actual_delivery_date?: Date | string
    payment_terms?: string
    notes?: string
    metadata?: {
      confirmed_at?: string
    }
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'draft': return 'grey'
    case 'sent': return 'blue'
    case 'confirmed': return 'orange'
    case 'partially_received': return 'purple'
    case 'received': return 'green'
    case 'cancelled': return 'red'
    default: return 'grey'
  }
}

const getStatusLabel = (status: string) => {
  return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
}

const formatDate = (date?: Date | string) => {
  if (!date) return null
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'partially_received', label: 'Partially Received' },
  { value: 'received', label: 'Received' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const PurchaseOrderTimeline = ({ data }: PurchaseOrderTimelineProps) => {
  const queryClient = useQueryClient()
  const currentStatus = data.status

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await fetch(`/admin/purchase-orders/${data.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || "Failed to update status")
      }
      
      return response.json()
    },
    onSuccess: (response) => {
      // Update the cache immediately with the response data
      queryClient.setQueryData(["purchase-order", data.id], response.purchase_order)
      
      // Invalidate queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["purchase-order", data.id] })
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
      
      toast.success("Status updated successfully")
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`)
    }
  })

  const handleStatusChange = (newStatus: string) => {
    if (newStatus !== currentStatus && !updateStatusMutation.isPending) {
      updateStatusMutation.mutate(newStatus)
    }
  }

  return (
    <Container>
      <Header title="Order Details" />
      <SectionRow 
        title="Status" 
        value={
          <Select 
            value={currentStatus}
            onValueChange={handleStatusChange}
            disabled={updateStatusMutation.isPending}
          >
            <Select.Trigger className="w-[180px]">
              <Select.Value>
                <StatusBadge color={getStatusColor(currentStatus) as any}>
                  {getStatusLabel(currentStatus)}
                </StatusBadge>
              </Select.Value>
            </Select.Trigger>
            <Select.Content>
              {STATUS_OPTIONS.map(status => (
                <Select.Item key={status.value} value={status.value}>
                  <div className="flex items-center gap-2">
                    <StatusBadge color={getStatusColor(status.value) as any} size="small">
                      {status.label}
                    </StatusBadge>
                  </div>
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        } 
      />
      {data.order_date && (
        <SectionRow 
          title="Order Date" 
          value={formatDate(data.order_date)} 
        />
      )}
      {data.metadata?.confirmed_at && (
        <SectionRow 
          title="Confirmed Date" 
          value={formatDate(data.metadata.confirmed_at)} 
        />
      )}
      {data.expected_delivery_date && (
        <SectionRow 
          title="Expected Delivery" 
          value={formatDate(data.expected_delivery_date)} 
        />
      )}
      {data.actual_delivery_date && (
        <SectionRow 
          title="Actual Delivery" 
          value={formatDate(data.actual_delivery_date)} 
        />
      )}
      {data.payment_terms && (
        <SectionRow 
          title="Payment Terms" 
          value={data.payment_terms} 
        />
      )}
      {data.notes && (
        <SectionRow
          title="Notes"
          value={<Text size="small" className="whitespace-pre-line">{data.notes}</Text>}
        />
      )}
    </Container>
  )
}
