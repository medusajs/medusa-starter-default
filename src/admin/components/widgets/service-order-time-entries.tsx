import { 
  Container, 
  Heading, 
  Text, 
  Button, 
  Table,
  Input,
  Select,
  FocusModal,
  Label,
  toast,
  DropdownMenu,
  StatusBadge,
} from "@medusajs/ui"
import { Clock, Plus, EllipsisHorizontal, Pencil, Trash } from "@medusajs/icons"
import { useState, useEffect } from "react"
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
  is_active?: boolean
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
  const [showStartModal, setShowStartModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [elapsedTime, setElapsedTime] = useState<{ [key: string]: number }>({})
  
  const [startFormData, setStartFormData] = useState({
    work_description: '',
    work_category: 'repair',
    hourly_rate: 85,
  })
  
  const [formData, setFormData] = useState({
    work_description: '',
    work_category: 'repair',
    start_time: '',
    end_time: '',
    billable_hours: 0,
    hourly_rate: 85,
    notes: '',
  })

  // Format time display
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Format duration for completed entries
  const formatTimeDisplay = (hours: number) => {
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)
    
    if (wholeHours === 0) {
      return `${minutes}m`
    } else if (minutes === 0) {
      return `${wholeHours}h`
    } else {
      return `${wholeHours}h ${minutes}m`
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

  const entries = timeEntries?.time_entries || []
  const activeEntry = entries.find((entry: TimeEntry) => entry.is_active)

  // Update elapsed time for active entry
  useEffect(() => {
    if (!activeEntry) return

    const interval = setInterval(() => {
      const startTime = new Date(activeEntry.start_time).getTime()
      const currentTime = new Date().getTime()
      const elapsed = Math.floor((currentTime - startTime) / 1000)
      
      setElapsedTime(prev => ({
        ...prev,
        [activeEntry.id]: elapsed
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [activeEntry])

  const startTimerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/admin/service-orders/${serviceOrder.id}/time-entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          start_time: new Date().toISOString(),
          is_active: true,
          billable_hours: 0, // Will be calculated when stopped
        }),
      })
      if (!response.ok) throw new Error("Failed to start timer")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-order-time-entries", serviceOrder.id] })
      queryClient.invalidateQueries({ queryKey: ["service-order", serviceOrder.id] })
      setShowStartModal(false)
      setStartFormData({
        work_description: '',
        work_category: 'repair',
        hourly_rate: 85,
      })
      toast.success("Timer started successfully")
    },
    onError: (error) => {
      toast.error(`Failed to start timer: ${error.message}`)
    }
  })

  const stopTimerMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log("Stop timer called with ID:", id)
      console.log("Available entries:", entries)
      
      if (!id) {
        throw new Error("No time entry ID provided")
      }
      
      const endTime = new Date()
      const entry = entries.find((e: TimeEntry) => e.id === id)
      console.log("Found entry:", entry)
      
      if (!entry) {
        throw new Error(`Entry not found with ID: ${id}`)
      }
      
      if (!entry.is_active) {
        throw new Error("Cannot stop inactive timer")
      }
      
      const startTime = new Date(entry.start_time)
      const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
      
      const updatePayload = {
        start_time: entry.start_time, // Keep original start time
        end_time: endTime.toISOString(),
        billable_hours: Math.round(durationHours * 100) / 100,
        hourly_rate: entry.hourly_rate, // Keep original hourly rate
        work_description: entry.work_description, // Keep original description
        work_category: entry.work_category, // Keep original category
        is_active: false,
        notes: entry.notes || "",
      }
      
      console.log("Update payload:", updatePayload)
      
      const response = await fetch(`/admin/service-orders/${serviceOrder.id}/time-entries/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("API Error Response:", errorData)
        throw new Error(errorData.details || errorData.error || "Failed to stop timer")
      }
      
      return response.json()
    },
    onSuccess: (data) => {
      console.log("Stop timer success response:", data)
      queryClient.invalidateQueries({ queryKey: ["service-order-time-entries", serviceOrder.id] })
      queryClient.invalidateQueries({ queryKey: ["service-order", serviceOrder.id] })
      // Force refetch to ensure UI updates immediately
      queryClient.refetchQueries({ queryKey: ["service-order-time-entries", serviceOrder.id] })
      toast.success("Timer stopped and saved")
    },
    onError: (error) => {
      console.error("Stop timer error:", error)
      toast.error(`Failed to stop timer: ${error.message}`)
    }
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
          total_cost: timeData.billable_hours * timeData.hourly_rate,
          is_active: false,
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
          total_cost: timeData.billable_hours * timeData.hourly_rate,
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

  const handleStartTimer = (e: React.FormEvent) => {
    e.preventDefault()
    startTimerMutation.mutate(startFormData)
  }

  const handleAddTimeEntry = (e: React.FormEvent) => {
    e.preventDefault()
    addTimeEntryMutation.mutate(formData)
  }

  if (!serviceOrder) {
    return null
  }

  const completedEntries = entries.filter((entry: TimeEntry) => !entry.is_active)

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Time Tracking</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {completedEntries.length} completed entr{completedEntries.length !== 1 ? 'ies' : 'y'}
            {activeEntry && ", 1 active timer"}
          </Text>
        </div>
        <div className="flex items-center gap-3">
          {!activeEntry && (
            <Button size="small" variant="primary" onClick={() => setShowStartModal(true)}>
              Start Timer
            </Button>
          )}
          <Button size="small" variant="secondary" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Entry
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
            Start tracking time spent on this service order
          </Text>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Description</Table.HeaderCell>
              <Table.HeaderCell>Category</Table.HeaderCell>
              <Table.HeaderCell>Duration</Table.HeaderCell>
              <Table.HeaderCell>Rate</Table.HeaderCell>
              <Table.HeaderCell>Total</Table.HeaderCell>
              <Table.HeaderCell>Actions</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {entries.map((entry: TimeEntry) => (
              <Table.Row 
                key={entry.id} 
                className={entry.is_active ? "bg-ui-bg-subtle" : ""}
              >
                <Table.Cell>
                  {entry.is_active ? (
                    <StatusBadge color="blue">Active</StatusBadge>
                  ) : (
                    <StatusBadge color="green">Complete</StatusBadge>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">{entry.work_description}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small" className="capitalize">{entry.work_category}</Text>
                </Table.Cell>
                <Table.Cell>
                  {entry.is_active ? (
                    <Text size="small" className="font-mono">
                      {formatTime(elapsedTime[entry.id] || 0)}
                    </Text>
                  ) : (
                    <Text size="small">{formatTimeDisplay(entry.billable_hours)}</Text>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">€{entry.hourly_rate}/hr</Text>
                </Table.Cell>
                <Table.Cell>
                  {entry.is_active ? (
                    <Text size="small" className="text-ui-fg-subtle">-</Text>
                  ) : (
                    <Text size="small">€{entry.total_cost?.toFixed(2)}</Text>
                  )}
                </Table.Cell>
                <Table.Cell>
                  {entry.is_active ? (
                    <Button
                      size="small"
                      variant="primary"
                      onClick={() => stopTimerMutation.mutate(entry.id)}
                      disabled={stopTimerMutation.isPending}
                    >
                      Stop & Save
                    </Button>
                  ) : (
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
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      {/* Start Timer Modal */}
      <FocusModal open={showStartModal} onOpenChange={setShowStartModal}>
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
                  <Heading level="h2" className="mb-2">Start Timer</Heading>
                  <Text className="text-ui-fg-subtle">
                    Begin tracking time on this service order
                  </Text>
                </div>

                <form onSubmit={handleStartTimer} className="space-y-4">
                  <div>
                    <Label size="small" weight="plus" className="mb-2 block">
                      Work Description
                    </Label>
                    <Input
                      placeholder="What are you working on?"
                      value={startFormData.work_description}
                      onChange={(e) => setStartFormData(prev => ({ ...prev, work_description: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label size="small" weight="plus" className="mb-2 block">
                        Category
                      </Label>
                      <Select
                        value={startFormData.work_category}
                        onValueChange={(value) => setStartFormData(prev => ({ ...prev, work_category: value }))}
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
                    </div>
                    
                    <div>
                      <Label size="small" weight="plus" className="mb-2 block">
                        Hourly Rate (€)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="85.00"
                        value={startFormData.hourly_rate}
                        onChange={(e) => setStartFormData(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) || 85 }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowStartModal(false)}
                      disabled={startTimerMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      variant="primary"
                      disabled={startTimerMutation.isPending}
                    >
                      {startTimerMutation.isPending ? "Starting..." : "Start Timer"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>

      {/* Add Time Entry Modal */}
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
                    Manually add a completed time entry
                  </Text>
                </div>

                <form onSubmit={handleAddTimeEntry} className="space-y-4">
                  <div>
                    <Label size="small" weight="plus" className="mb-2 block">
                      Work Description
                    </Label>
                    <Input
                      placeholder="Work description"
                      value={formData.work_description}
                      onChange={(e) => setFormData(prev => ({ ...prev, work_description: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label size="small" weight="plus" className="mb-2 block">
                        Category
                      </Label>
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
                    </div>
                    
                    <div>
                      <Label size="small" weight="plus" className="mb-2 block">
                        Duration (hours)
                      </Label>
                      <Input
                        type="number"
                        step="0.25"
                        placeholder="1.5"
                        value={formData.billable_hours}
                        onChange={(e) => setFormData(prev => ({ ...prev, billable_hours: parseFloat(e.target.value) || 0 }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label size="small" weight="plus" className="mb-2 block">
                        Start Time
                      </Label>
                      <Input
                        type="datetime-local"
                        value={formData.start_time}
                        onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label size="small" weight="plus" className="mb-2 block">
                        Hourly Rate (€)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="85.00"
                        value={formData.hourly_rate}
                        onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) || 85 }))}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label size="small" weight="plus" className="mb-2 block">
                      Notes (optional)
                    </Label>
                    <Input
                      placeholder="Additional notes"
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
                      {addTimeEntryMutation.isPending ? "Adding..." : "Add Entry"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>

      {/* Edit Time Entry Modal */}
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
                    <Label size="small" weight="plus" className="mb-2 block">
                      Work Description
                    </Label>
                    <Input
                      placeholder="Work description"
                      value={formData.work_description}
                      onChange={(e) => setFormData(prev => ({ ...prev, work_description: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label size="small" weight="plus" className="mb-2 block">
                        Category
                      </Label>
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
                    </div>
                    
                    <div>
                      <Label size="small" weight="plus" className="mb-2 block">
                        Duration (hours)
                      </Label>
                      <Input
                        type="number"
                        step="0.25"
                        placeholder="1.5"
                        value={formData.billable_hours}
                        onChange={(e) => setFormData(prev => ({ ...prev, billable_hours: parseFloat(e.target.value) || 0 }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label size="small" weight="plus" className="mb-2 block">
                        Start Time
                      </Label>
                      <Input
                        type="datetime-local"
                        value={formData.start_time}
                        onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label size="small" weight="plus" className="mb-2 block">
                        End Time
                      </Label>
                      <Input
                        type="datetime-local"
                        value={formData.end_time}
                        onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label size="small" weight="plus" className="mb-2 block">
                        Hourly Rate (€)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="85.00"
                        value={formData.hourly_rate}
                        onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) || 85 }))}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label size="small" weight="plus" className="mb-2 block">
                      Notes (optional)
                    </Label>
                    <Input
                      placeholder="Additional notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setShowEditModal(false)
                        setEditingEntry(null)
                      }}
                      disabled={updateTimeEntryMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={updateTimeEntryMutation.isPending}
                    >
                      {updateTimeEntryMutation.isPending ? "Updating..." : "Update Entry"}
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
