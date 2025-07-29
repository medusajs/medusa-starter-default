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
  Label,
  toast,
  DropdownMenu
} from "@medusajs/ui"
import { Clock, Plus, PlaySolid, PauseSolid, Stopwatch, EllipsisHorizontal, Pencil, Trash } from "@medusajs/icons"
import { useState, useEffect, useRef } from "react"
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

// Timer Component
const Timer = ({ 
  serviceOrderId, 
  onTimeEntryCreated 
}: { 
  serviceOrderId: string
  onTimeEntryCreated: () => void 
}) => {
  const [isRunning, setIsRunning] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [hourlyRate, setHourlyRate] = useState(85)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const queryClient = useQueryClient()

  const addTimeEntryMutation = useMutation({
    mutationFn: async (timeData: any) => {
      const response = await fetch(`/admin/service-orders/${serviceOrderId}/time-entries`, {
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
      queryClient.invalidateQueries({ queryKey: ["service-order-time-entries", serviceOrderId] })
      queryClient.invalidateQueries({ queryKey: ["service-order", serviceOrderId] })
      toast.success("Time entry added successfully")
      onTimeEntryCreated()
    },
    onError: (error) => {
      toast.error(`Failed to add time entry: ${error.message}`)
    }
  })

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1)
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning])

  const startTimer = () => {
    setIsRunning(true)
    setStartTime(new Date())
    setElapsedTime(0)
  }

  const stopTimer = () => {
    if (!isRunning || !startTime) return

    const endTime = new Date()
    const durationHours = elapsedTime / 3600 // Convert seconds to hours
    
    addTimeEntryMutation.mutate({
      work_description: "Time logged",
      work_category: "repair",
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      billable_hours: Math.round(durationHours * 100) / 100, // Round to 2 decimal places
      hourly_rate: hourlyRate,
      notes: `Timer session: ${formatTime(elapsedTime)}`,
    })

    // Reset timer state
    setIsRunning(false)
    setElapsedTime(0)
    setStartTime(null)
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-3">
      {/* Timer Display */}
      <div className="flex items-center gap-2 bg-ui-bg-base border border-ui-border-base rounded-md px-3 py-2">
        <Stopwatch className="w-4 h-4 text-ui-fg-subtle" />
        <Text size="small" className="font-mono">
          {formatTime(elapsedTime)}
        </Text>
      </div>

      {/* Start/Stop Button */}
      <Button
        size="small"
        variant={isRunning ? "danger" : "primary"}
        onClick={isRunning ? stopTimer : startTimer}
        disabled={addTimeEntryMutation.isPending}
      >
        {isRunning ? (
          <>
            <PauseSolid className="w-4 h-4 mr-2" />
            Stop Timer
          </>
        ) : (
          <>
            <PlaySolid className="w-4 h-4 mr-2" />
            Start Timer
          </>
        )}
      </Button>

      {/* Hourly Rate Setting */}
      <div className="flex items-center gap-2">
        <Label size="small" weight="plus">
          Rate:
        </Label>
        <Input
          type="number"
          step="0.01"
          placeholder="85.00"
          value={hourlyRate}
          onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 85)}
          className="w-20"
          size="small"
        />
        <Text size="small" className="text-ui-fg-subtle">
          €/hr
        </Text>
      </div>
    </div>
  )
}

const ServiceOrderTimeEntriesWidget = ({ data: serviceOrder }: ServiceOrderTimeEntriesWidgetProps) => {
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [formData, setFormData] = useState({
    work_description: '',
    work_category: 'repair',
    start_time: '',
    end_time: '',
    billable_hours: 0,
    hourly_rate: 85,
    notes: '',
  })

  // Helper function to format time as "X hours X minutes"
  const formatTimeDisplay = (hours: number) => {
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)
    
    if (wholeHours === 0) {
      return `${minutes} minutes`
    } else if (minutes === 0) {
      return `${wholeHours} hours`
    } else {
      return `${wholeHours} hours ${minutes} minutes`
    }
  }

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

  const updateTimeEntryMutation = useMutation({
    mutationFn: async ({ id, timeData }: { id: string, timeData: any }) => {
      const response = await fetch(`/admin/service-orders/${serviceOrder.id}/time-entries/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...timeData,
          start_time: new Date(timeData.start_time).toISOString(),
          end_time: timeData.end_time ? new Date(timeData.end_time).toISOString() : undefined,
        }),
      })
      if (!response.ok) throw new Error("Failed to update time entry")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-order-time-entries", serviceOrder.id] })
      queryClient.invalidateQueries({ queryKey: ["service-order", serviceOrder.id] })
      setShowEditModal(false)
      setEditingEntry(null)
      toast.success("Time entry updated successfully")
    },
    onError: (error) => {
      toast.error(`Failed to update time entry: ${error.message}`)
    }
  })

  const deleteTimeEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/admin/service-orders/${serviceOrder.id}/time-entries/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete time entry")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-order-time-entries", serviceOrder.id] })
      queryClient.invalidateQueries({ queryKey: ["service-order", serviceOrder.id] })
      toast.success("Time entry deleted successfully")
    },
    onError: (error) => {
      toast.error(`Failed to delete time entry: ${error.message}`)
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
        <div className="flex items-center gap-3">
          <Timer 
            serviceOrderId={serviceOrder.id} 
            onTimeEntryCreated={() => {
              // This will trigger a refetch of the time entries
            }}
          />
          <Button size="small" variant="secondary" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Time Entry
          </Button>
        </div>
      </div>

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
              <Table.HeaderCell><Label size="small" weight="plus">Date</Label></Table.HeaderCell>
              <Table.HeaderCell><Label size="small" weight="plus">Time</Label></Table.HeaderCell>
              <Table.HeaderCell><Label size="small" weight="plus">Rate</Label></Table.HeaderCell>
              <Table.HeaderCell><Label size="small" weight="plus">Total</Label></Table.HeaderCell>
              <Table.HeaderCell><Label size="small" weight="plus">Actions</Label></Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {entries.map((entry: TimeEntry) => (
              <Table.Row key={entry.id}>
                <Table.Cell>
                  <Text size="small" className="text-ui-fg-subtle">
                    {new Date(entry.start_time).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">{formatTimeDisplay(entry.billable_hours)}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">€{entry.hourly_rate}/hr</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">€{entry.total_cost?.toFixed(2)}</Text>
                </Table.Cell>
                <Table.Cell>
                  <DropdownMenu>
                    <DropdownMenu.Trigger asChild>
                      <Button variant="transparent" size="small">
                        <EllipsisHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content>
                      <DropdownMenu.Item
                        onClick={() => {
                          setEditingEntry(entry)
                          setFormData({
                            work_description: entry.work_description,
                            work_category: entry.work_category,
                            start_time: new Date(entry.start_time).toISOString().slice(0, 16),
                            end_time: entry.end_time ? new Date(entry.end_time).toISOString().slice(0, 16) : '',
                            billable_hours: entry.billable_hours,
                            hourly_rate: entry.hourly_rate,
                            notes: entry.notes || '',
                          })
                          setShowEditModal(true)
                        }}
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this time entry?')) {
                            deleteTimeEntryMutation.mutate(entry.id)
                          }
                        }}
                        className="text-red-600"
                      >
                        <Trash className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

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

      <FocusModal open={showEditModal} onOpenChange={setShowEditModal}>
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
                  <Heading level="h2" className="mb-2">Edit Time Entry</Heading>
                  <Text className="text-ui-fg-subtle">
                    Update time entry details
                  </Text>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault()
                  if (editingEntry) {
                    updateTimeEntryMutation.mutate({ id: editingEntry.id, timeData: formData })
                  }
                }} className="space-y-4">
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
                      onClick={() => setShowEditModal(false)}
                      disabled={updateTimeEntryMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={updateTimeEntryMutation.isPending}
                    >
                      {updateTimeEntryMutation.isPending ? "Updating..." : "Update Time Entry"}
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