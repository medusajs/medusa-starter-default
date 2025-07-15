import { 
  Container, 
  Heading, 
  Text, 
  Badge, 
  Button, 
  Table,
  Input,
  Textarea,
  Select,
  FocusModal,
  toast
} from "@medusajs/ui"
import { Clock, Plus } from "@medusajs/icons"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface TimeEntry {
  id: string
  work_description: string
  work_category: string
  billable_hours: number
  hourly_rate: number
  total_cost: number
  start_time: string
  end_time?: string
  notes?: string
}

interface ServiceOrder {
  id: string
  service_order_number: string
}

interface ServiceOrderTimeEntriesWidgetProps {
  data: ServiceOrder
}

const ServiceOrderTimeEntriesWidget = ({ data: serviceOrder }: ServiceOrderTimeEntriesWidgetProps) => {
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState({
    work_description: '',
    work_category: 'repair',
    start_time: '',
    end_time: '',
    billable_hours: 0,
    hourly_rate: 85,
    notes: '',
  })

  const { data: timeEntries, isLoading } = useQuery({
    queryKey: ["service-order-time-entries", serviceOrder?.id],
    queryFn: async () => {
      const response = await fetch(`/admin/service-orders/${serviceOrder.id}/time-entries`)
      if (!response.ok) throw new Error("Failed to fetch time entries")
      return response.json()
    },
    enabled: !!serviceOrder?.id,
  })

  const addTimeEntryMutation = useMutation({
    mutationFn: async (timeData: any) => {
      const response = await fetch(`/admin/service-orders/${serviceOrder.id}/time-entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...timeData,
          start_time: new Date(timeData.start_time).toISOString(),
          end_time: timeData.end_time ? new Date(timeData.end_time).toISOString() : undefined,
        }),
      })
      if (!response.ok) throw new Error("Failed to add time entry")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-order-time-entries", serviceOrder.id] })
      queryClient.invalidateQueries({ queryKey: ["service-order", serviceOrder.id] })
      setShowAddModal(false)
      setFormData({
        work_description: '',
        work_category: 'repair',
        start_time: '',
        end_time: '',
        billable_hours: 0,
        hourly_rate: 85,
        notes: '',
      })
      toast.success("Time entry added successfully")
    },
    onError: (error) => {
      toast.error(`Failed to add time entry: ${error.message}`)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addTimeEntryMutation.mutate(formData)
  }

  if (!serviceOrder) {
    return null
  }

  const entries = timeEntries?.time_entries || []

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Time Entries</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {entries.length} time entr{entries.length !== 1 ? 'ies' : 'y'} recorded
          </Text>
        </div>
        <Button size="small" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Time Entry
        </Button>
      </div>

      <div className="px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Text>Loading time entries...</Text>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Clock className="w-12 h-12 text-ui-fg-muted mb-4" />
            <Text className="text-ui-fg-muted mb-2">No time entries recorded yet</Text>
            <Text size="small" className="text-ui-fg-subtle">
              Track time spent on this service order
            </Text>
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
              {entries.map((entry: TimeEntry) => (
                <Table.Row key={entry.id}>
                  <Table.Cell>
                    <div>
                      <Text size="small">{entry.work_description}</Text>
                      {entry.notes && (
                        <Text size="small" className="text-ui-fg-subtle">
                          {entry.notes}
                        </Text>
                      )}
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge size="2xsmall" variant="secondary">
                      {entry.work_category}
                    </Badge>
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

      <FocusModal open={showAddModal} onOpenChange={setShowAddModal}>
        <FocusModal.Content>
          <FocusModal.Header>
            <div className="flex items-center justify-end">
              <FocusModal.Close asChild>
                <Button variant="secondary">Cancel</Button>
              </FocusModal.Close>
            </div>
          </FocusModal.Header>
          <FocusModal.Body>
            <div className="flex flex-col items-center p-16">
              <div className="w-full max-w-lg">
                <div className="mb-8 text-center">
                  <Heading level="h2" className="mb-2">Add Time Entry</Heading>
                  <Text className="text-ui-fg-subtle">
                    Record time spent on this service order
                  </Text>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Textarea
                      placeholder="Work description"
                      value={formData.work_description}
                      onChange={(e) => setFormData(prev => ({ ...prev, work_description: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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

                  <div>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Hourly rate"
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) }))}
                      required
                    />
                  </div>

                  <div>
                    <Textarea
                      placeholder="Notes (optional)"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowAddModal(false)}
                      disabled={addTimeEntryMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={addTimeEntryMutation.isPending}
                    >
                      {addTimeEntryMutation.isPending ? "Adding..." : "Add Time Entry"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </Container>
  )
}

export default ServiceOrderTimeEntriesWidget