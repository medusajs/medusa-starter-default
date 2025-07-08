import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowLeft, Clock, ReceiptPercent, CogSixTooth, Tools } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  StatusBadge,
  Tabs,
  Text,
  Table,
  Input,
  Select,
  Textarea,
  toast,
} from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Link, useParams } from "react-router-dom"

const ServiceOrderDetails = () => {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState("overview")

  const { data: serviceOrder, isLoading, refetch } = useQuery({
    queryKey: ["service-order", id],
    queryFn: async () => {
      const response = await fetch(`/admin/service-orders/${id}`)
      if (!response.ok) throw new Error("Failed to fetch service order")
      return response.json()
    },
    enabled: !!id,
  })

  const { data: items } = useQuery({
    queryKey: ["service-order-items", id],
    queryFn: async () => {
      const response = await fetch(`/admin/service-orders/${id}/items`)
      if (!response.ok) throw new Error("Failed to fetch items")
      return response.json()
    },
    enabled: !!id,
  })

  const { data: timeEntries } = useQuery({
    queryKey: ["service-order-time-entries", id],
    queryFn: async () => {
      const response = await fetch(`/admin/service-orders/${id}/time-entries`)
      if (!response.ok) throw new Error("Failed to fetch time entries")
      return response.json()
    },
    enabled: !!id,
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, reason }: { status: string; reason?: string }) => {
      console.log("Mutation starting for status:", status)
      const response = await fetch(`/admin/service-orders/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error("Status update API error:", errorData)
        throw new Error(errorData.details || "Failed to update status")
      }
      
      const result = await response.json()
      console.log("Status update API response:", result)
      return result
    },
    onSuccess: async (data) => {
      console.log("Status update successful:", data)
      toast.success("Service order status updated successfully!")
      
      // Force refetch the service order data
      await refetch()
      
      // Also invalidate all related queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["service-order", id] })
      queryClient.invalidateQueries({ queryKey: ["service-orders"] })
    },
    onError: (error: Error) => {
      console.error("Status update failed:", error)
      toast.error(`Failed to update status: ${error.message}`)
    },
    onSettled: () => {
      // This runs regardless of success or failure
      console.log("Status update mutation settled")
    }
  })

  const addItemMutation = useMutation({
    mutationFn: async (itemData: any) => {
      const response = await fetch(`/admin/service-orders/${id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemData),
      })
      if (!response.ok) throw new Error("Failed to add item")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-order-items", id] })
      queryClient.invalidateQueries({ queryKey: ["service-order", id] })
    },
  })

  const addTimeEntryMutation = useMutation({
    mutationFn: async (timeData: any) => {
      const response = await fetch(`/admin/service-orders/${id}/time-entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(timeData),
      })
      if (!response.ok) throw new Error("Failed to add time entry")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-order-time-entries", id] })
      queryClient.invalidateQueries({ queryKey: ["service-order", id] })
    },
  })

  if (isLoading) {
    return (
      <Container>
        <Text>Loading service order...</Text>
      </Container>
    )
  }

  if (!serviceOrder?.service_order) {
    return (
      <Container>
        <Text>Service order not found</Text>
      </Container>
    )
  }

  const so = serviceOrder.service_order

  const statusVariants = {
    draft: "orange",
    scheduled: "blue",
    in_progress: "purple", 
    waiting_parts: "orange",
    customer_approval: "orange",
    completed: "green",
    cancelled: "red",
  } as const

  const priorityVariants = {
    low: "grey",
    normal: "blue",
    high: "orange",
    urgent: "red", 
  } as const

  return (
    <Container>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button size="small" variant="transparent" asChild>
          <Link to="/service-orders">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Heading level="h1">{so.service_order_number}</Heading>
            <StatusBadge color={statusVariants[so.status as keyof typeof statusVariants]}>
              {so.status.replace('_', ' ')}
            </StatusBadge>
            <Badge color={priorityVariants[so.priority as keyof typeof priorityVariants]}>
              {so.priority} priority
            </Badge>
          </div>
          <Text className="text-ui-fg-subtle">
            {so.description}
          </Text>
        </div>
        <StatusUpdateForm 
          currentStatus={so.status}
          onStatusUpdate={(status, reason) => updateStatusMutation.mutate({ status, reason })}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Trigger value="overview">
            <CogSixTooth className="w-4 h-4" />
            Overview
          </Tabs.Trigger>
          <Tabs.Trigger value="items">
            <Tools className="w-4 h-4" />
            Parts & Items ({items?.items?.length || 0})
          </Tabs.Trigger>
          <Tabs.Trigger value="time">
            <Clock className="w-4 h-4" />
            Time Entries ({timeEntries?.time_entries?.length || 0})
          </Tabs.Trigger>
          <Tabs.Trigger value="history">
            <ReceiptPercent className="w-4 h-4" />
            Status History
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="overview" className="mt-6">
          <OverviewTab serviceOrder={so} />
        </Tabs.Content>

        <Tabs.Content value="items" className="mt-6">
          <ItemsTab 
            items={items?.items || []}
            onAddItem={(itemData) => addItemMutation.mutate(itemData)}
          />
        </Tabs.Content>

        <Tabs.Content value="time" className="mt-6">
          <TimeEntriesTab 
            timeEntries={timeEntries?.time_entries || []}
            onAddTimeEntry={(timeData) => addTimeEntryMutation.mutate(timeData)}
          />
        </Tabs.Content>

        <Tabs.Content value="history" className="mt-6">
          <StatusHistoryTab statusHistory={serviceOrder?.service_order?.status_history || []} />
        </Tabs.Content>
      </Tabs>
    </Container>
  )
}

// Overview Tab Component
const OverviewTab = ({ serviceOrder }: { serviceOrder: any }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="lg:col-span-2">
      <Container className="p-6 bg-ui-bg-subtle rounded-lg">
        <Heading level="h3">Service Details</Heading>
        <div className="space-y-4 mt-4">
          <div>
            <Text size="small" weight="plus" className="text-ui-fg-subtle">Description</Text>
            <Text>{serviceOrder.description}</Text>
          </div>
          {serviceOrder.customer_complaint && (
            <div>
              <Text size="small" weight="plus" className="text-ui-fg-subtle">Customer Complaint</Text>
              <Text>{serviceOrder.customer_complaint}</Text>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Text size="small" weight="plus" className="text-ui-fg-subtle">Service Type</Text>
              <Badge>{serviceOrder.service_type}</Badge>
            </div>
            <div>
              <Text size="small" weight="plus" className="text-ui-fg-subtle">Priority</Text>
              <Badge>{serviceOrder.priority}</Badge>
            </div>
          </div>
        </div>
      </Container>
    </div>
    
    <div>
      <Container className="p-6 bg-ui-bg-subtle rounded-lg">
        <Heading level="h3">Cost Summary</Heading>
        <div className="space-y-3 mt-4">
          <div className="flex justify-between">
            <Text size="small">Labor Cost:</Text>
            <Text size="small">${serviceOrder.total_labor_cost?.toFixed(2) || '0.00'}</Text>
          </div>
          <div className="flex justify-between">
            <Text size="small">Parts Cost:</Text>
            <Text size="small">${serviceOrder.total_parts_cost?.toFixed(2) || '0.00'}</Text>
          </div>
          <div className="flex justify-between border-t pt-2">
            <Text weight="plus">Total:</Text>
            <Text weight="plus">${serviceOrder.total_cost?.toFixed(2) || '0.00'}</Text>
          </div>
          <div className="flex justify-between">
            <Text size="small">Hours (Est/Actual):</Text>
            <Text size="small">{serviceOrder.estimated_hours || 0}/{serviceOrder.actual_hours || 0}</Text>
          </div>
        </div>
      </Container>
    </div>
  </div>
)

// Items Tab Component 
const ItemsTab = ({ items, onAddItem }: { items: any[]; onAddItem: (data: any) => void }) => {
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sku: '',
    quantity_needed: 1,
    unit_price: 0,
    notes: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAddItem(formData)
    setFormData({
      title: '',
      description: '',
      sku: '', 
      quantity_needed: 1,
      unit_price: 0,
      notes: '',
    })
    setShowAddForm(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Heading level="h3">Parts & Items</Heading>
        <Button size="small" onClick={() => setShowAddForm(!showAddForm)}>
          Add Item
        </Button>
      </div>

      {showAddForm && (
        <Container className="p-6 bg-ui-bg-subtle rounded-lg">
          <Heading level="h3">Add New Item</Heading>
          <div className="space-y-4 mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Item title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
                <Input
                  placeholder="SKU (optional)"
                  value={formData.sku}
                  onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                />
                <Input
                  type="number"
                  placeholder="Quantity needed"
                  value={formData.quantity_needed}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity_needed: parseInt(e.target.value) }))}
                  required
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Unit price"
                  value={formData.unit_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit_price: parseFloat(e.target.value) }))}
                  required
                />
              </div>
              <Textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
              <div className="flex gap-2">
                <Button type="submit" size="small">Add Item</Button>
                <Button type="button" variant="secondary" size="small" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </Container>
      )}

      {items.length === 0 ? (
        <div className="text-center py-8">
          <Tools className="w-12 h-12 mx-auto mb-4 text-ui-fg-muted" />
          <Text>No items added yet</Text>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Item</Table.HeaderCell>
              <Table.HeaderCell>SKU</Table.HeaderCell>
              <Table.HeaderCell>Quantity</Table.HeaderCell>
              <Table.HeaderCell>Unit Price</Table.HeaderCell>
              <Table.HeaderCell>Total</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {items.map((item: any) => (
              <Table.Row key={item.id}>
                <Table.Cell>
                  <div>
                    <Text weight="plus" size="small">{item.title}</Text>
                    {item.description && (
                      <Text size="small" className="text-ui-fg-subtle">{item.description}</Text>
                    )}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">{item.sku || '-'}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">{item.quantity_needed}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">${item.unit_price?.toFixed(2)}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">${item.total_price?.toFixed(2)}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Badge size="2xsmall">{item.status}</Badge>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </div>
  )
}

// Time Entries Tab Component
const TimeEntriesTab = ({ timeEntries, onAddTimeEntry }: { timeEntries: any[]; onAddTimeEntry: (data: any) => void }) => {
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    work_description: '',
    work_category: 'repair',
    start_time: '',
    end_time: '',
    billable_hours: 0,
    hourly_rate: 85,
    notes: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAddTimeEntry({
      ...formData,
      start_time: new Date(formData.start_time).toISOString(),
      end_time: formData.end_time ? new Date(formData.end_time).toISOString() : undefined,
    })
    setFormData({
      work_description: '',
      work_category: 'repair',
      start_time: '',
      end_time: '',
      billable_hours: 0,
      hourly_rate: 85,
      notes: '',
    })
    setShowAddForm(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Heading level="h3">Time Entries</Heading>
        <Button size="small" onClick={() => setShowAddForm(!showAddForm)}>
          Add Time Entry
        </Button>
      </div>

      {showAddForm && (
        <Container className="p-6 bg-ui-bg-subtle rounded-lg">
          <Heading level="h3">Add Time Entry</Heading>
          <div className="space-y-4 mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                placeholder="Work description"
                value={formData.work_description}
                onChange={(e) => setFormData(prev => ({ ...prev, work_description: e.target.value }))}
                required
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  value={formData.work_category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, work_category: value }))}
                >
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="diagnosis">Diagnosis</Select.Item>
                    <Select.Item value="repair">Repair</Select.Item>
                    <Select.Item value="testing">Testing</Select.Item>
                    <Select.Item value="documentation">Documentation</Select.Item>
                    <Select.Item value="travel">Travel</Select.Item>
                  </Select.Content>
                </Select>
                <Input
                  type="number"
                  step="0.25"
                  placeholder="Billable hours"
                  value={formData.billable_hours}
                  onChange={(e) => setFormData(prev => ({ ...prev, billable_hours: parseFloat(e.target.value) }))}
                  required
                />
                <Input
                  type="datetime-local"
                  placeholder="Start time"
                  value={formData.start_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                  required
                />
                <Input
                  type="datetime-local"
                  placeholder="End time (optional)"
                  value={formData.end_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                />
              </div>
              <Input
                type="number"
                step="0.01"
                placeholder="Hourly rate"
                value={formData.hourly_rate}
                onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) }))}
                required
              />
              <div className="flex gap-2">
                <Button type="submit" size="small">Add Time Entry</Button>
                <Button type="button" variant="secondary" size="small" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </Container>
      )}

      {timeEntries.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 mx-auto mb-4 text-ui-fg-muted" />
          <Text>No time entries recorded yet</Text>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Description</Table.HeaderCell>
              <Table.HeaderCell>Category</Table.HeaderCell>
              <Table.HeaderCell>Hours</Table.HeaderCell>
              <Table.HeaderCell>Rate</Table.HeaderCell>
              <Table.HeaderCell>Total</Table.HeaderCell>
              <Table.HeaderCell>Date</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {timeEntries.map((entry: any) => (
              <Table.Row key={entry.id}>
                <Table.Cell>
                  <Text size="small">{entry.work_description}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Badge size="2xsmall">{entry.work_category}</Badge>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">{entry.billable_hours}h</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">${entry.hourly_rate}/hr</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">${entry.total_cost?.toFixed(2)}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small" className="text-ui-fg-subtle">
                    {new Date(entry.start_time).toLocaleDateString()}
                  </Text>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </div>
  )
}

// Status History Tab Component
const StatusHistoryTab = ({ statusHistory }: { statusHistory: any[] }) => {
  // Sort status history by date (newest first)
  const sortedHistory = [...statusHistory].sort((a, b) => 
    new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Heading level="h3">Status History</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {statusHistory.length} status change{statusHistory.length !== 1 ? 's' : ''}
        </Text>
      </div>
      {sortedHistory.length === 0 ? (
        <div className="text-center py-8">
          <ReceiptPercent className="w-12 h-12 mx-auto mb-4 text-ui-fg-muted" />
          <Text>No status changes recorded</Text>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>From</Table.HeaderCell>
              <Table.HeaderCell>To</Table.HeaderCell>
              <Table.HeaderCell>Changed By</Table.HeaderCell>
              <Table.HeaderCell>Reason</Table.HeaderCell>
              <Table.HeaderCell>Date</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {sortedHistory.map((history: any) => (
              <Table.Row key={history.id}>
                <Table.Cell>
                  {history.from_status ? (
                    <Badge size="2xsmall" color="grey">
                      {history.from_status.replace('_', ' ')}
                    </Badge>
                  ) : (
                    <Text size="small" className="text-ui-fg-muted">-</Text>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <Badge size="2xsmall" color="blue">
                    {history.to_status.replace('_', ' ')}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">{history.changed_by}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small" className={history.reason ? '' : 'text-ui-fg-muted'}>
                    {history.reason || 'No reason provided'}
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
  )
}

// Status Update Form Component
const StatusUpdateForm = ({ currentStatus, onStatusUpdate }: { currentStatus: string; onStatusUpdate: (status: string, reason?: string) => void }) => {
  const [showForm, setShowForm] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const statuses = [
    { value: 'draft', label: 'Draft' },
    { value: 'scheduled', label: 'Scheduled' }, 
    { value: 'in_progress', label: 'In Progress' },
    { value: 'waiting_parts', label: 'Waiting for Parts' },
    { value: 'customer_approval', label: 'Customer Approval' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent multiple submissions
    if (isSubmitting || !newStatus || newStatus === currentStatus) {
      console.log("Preventing submission:", { isSubmitting, newStatus, currentStatus })
      return
    }
    
    setIsSubmitting(true)
    console.log("Submitting status update:", newStatus, reason)
    
    // Call the mutation
    onStatusUpdate(newStatus, reason)
    
    // Reset form after a brief delay to prevent multiple submissions
    setTimeout(() => {
      setShowForm(false)
      setReason('')
      setNewStatus('')
      setIsSubmitting(false)
    }, 1000)
  }

  if (!showForm) {
    return (
      <Button size="small" onClick={() => setShowForm(true)}>
        Update Status
      </Button>
    )
  }

  return (
    <div className="relative">
      <div className="absolute right-0 top-0 w-80 p-6 bg-ui-bg-base border border-ui-border-base rounded-lg shadow-lg z-50">
        <form onSubmit={handleSubmit}>
          <Heading level="h3" className="mb-4">Update Status</Heading>
          <div className="space-y-4">
            <div>
              <Text size="small" className="mb-2 text-ui-fg-subtle">Current Status: {currentStatus.replace('_', ' ')}</Text>
              <Select value={newStatus} onValueChange={setNewStatus} disabled={isSubmitting}>
                <Select.Trigger>
                  <Select.Value placeholder="Select new status" />
                </Select.Trigger>
                <Select.Content className="z-[60]">
                  {statuses.filter(s => s.value !== currentStatus).map(status => (
                    <Select.Item key={status.value} value={status.value}>
                      {status.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
            <Textarea
              placeholder="Reason for status change (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              disabled={isSubmitting}
            />
            <div className="flex gap-2">
              <Button type="submit" size="small" disabled={!newStatus || isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Status'}
              </Button>
              <Button 
                type="button" 
                variant="secondary" 
                size="small" 
                onClick={() => {
                  setShowForm(false)
                  setReason('')
                  setNewStatus('')
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Service Order Details",
})

export default ServiceOrderDetails 