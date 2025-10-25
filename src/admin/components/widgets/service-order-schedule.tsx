/**
 * Service Order Schedule Widget
 * 
 * Allows viewing and editing scheduled start and end dates for service orders.
 * Uses Medusa UI components and follows native patterns.
 * Integrates with the existing schedule update workflow.
 */

import { Container, Heading, Label, Text, Button, DatePicker, toast } from "@medusajs/ui"
import { PencilSquare, Calendar } from "@medusajs/icons"
import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"

interface ServiceOrder {
  id: string
  service_order_number: string
  scheduled_start_date?: string | null
  scheduled_end_date?: string | null
  status: string
}

interface ServiceOrderScheduleWidgetProps {
  data: ServiceOrder
}

const ServiceOrderScheduleWidget = ({ data: serviceOrder }: ServiceOrderScheduleWidgetProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>(
    serviceOrder.scheduled_start_date ? new Date(serviceOrder.scheduled_start_date) : undefined
  )
  const [endDate, setEndDate] = useState<Date | undefined>(
    serviceOrder.scheduled_end_date ? new Date(serviceOrder.scheduled_end_date) : undefined
  )
  const queryClient = useQueryClient()

  // Mutation to update schedule
  const updateScheduleMutation = useMutation({
    mutationFn: async (data: { scheduled_start_date: Date | null; scheduled_end_date: Date | null }) => {
      const response = await fetch(`/admin/service-orders/${serviceOrder.id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_start_date: data.scheduled_start_date?.toISOString() || null,
          scheduled_end_date: data.scheduled_end_date?.toISOString() || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.details || 'Failed to update schedule')
      }

      return response.json()
    },
    onSuccess: () => {
      toast.success('Schedule updated successfully')
      queryClient.invalidateQueries({ queryKey: ['service-order', serviceOrder.id] })
      queryClient.invalidateQueries({ queryKey: ['service-orders-calendar'] })
      setIsEditing(false)
    },
    onError: (error: Error) => {
      toast.error('Failed to update schedule', {
        description: error.message,
      })
    },
  })

  const handleSave = () => {
    // Validation
    if (startDate && endDate && startDate >= endDate) {
      toast.error('Invalid dates', {
        description: 'Start date must be before end date',
      })
      return
    }

    // Check minimum duration (30 minutes)
    if (startDate && endDate) {
      const duration = endDate.getTime() - startDate.getTime()
      const minDuration = 30 * 60 * 1000 // 30 minutes
      if (duration < minDuration) {
        toast.error('Invalid duration', {
          description: 'Service order must be at least 30 minutes',
        })
        return
      }
    }

    // Both dates must be set together or both null
    if ((startDate && !endDate) || (!startDate && endDate)) {
      toast.error('Invalid dates', {
        description: 'Both start and end dates must be set together',
      })
      return
    }

    updateScheduleMutation.mutate({
      scheduled_start_date: startDate || null,
      scheduled_end_date: endDate || null,
    })
  }

  const handleCancel = () => {
    // Reset to original values
    setStartDate(
      serviceOrder.scheduled_start_date ? new Date(serviceOrder.scheduled_start_date) : undefined
    )
    setEndDate(
      serviceOrder.scheduled_end_date ? new Date(serviceOrder.scheduled_end_date) : undefined
    )
    setIsEditing(false)
  }

  const handleClearSchedule = () => {
    setStartDate(undefined)
    setEndDate(undefined)
  }
  
  // Auto-set end date when start date changes (default to 2 hours later)
  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date)
    // If no end date is set and start date is selected, auto-set end date to 2 hours later
    if (date && !endDate) {
      const defaultEndDate = new Date(date.getTime() + 2 * 60 * 60 * 1000) // 2 hours later
      setEndDate(defaultEndDate)
    }
  }

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not scheduled'
    try {
      const date = new Date(dateString)
      return format(date, 'PPP p') // e.g., "Apr 29, 2023 9:00 AM"
    } catch {
      return 'Invalid date'
    }
  }

  const isScheduled = serviceOrder.scheduled_start_date && serviceOrder.scheduled_end_date

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Calendar className="text-ui-fg-subtle" />
          <Heading level="h2">Schedule</Heading>
        </div>
        {!isEditing && (
          <Button
            size="small"
            variant="transparent"
            onClick={() => setIsEditing(true)}
          >
            <PencilSquare className="w-4 h-4" />
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="px-6 py-4">
          <div className="flex flex-col gap-y-4">
            {/* Live duration indicator at the top */}
            {startDate && endDate && (
              <div className="flex items-center justify-between gap-2 bg-ui-bg-highlight p-3 rounded-lg border border-ui-border-base">
                <div className="flex items-center gap-2">
                  <Calendar className="text-ui-fg-interactive" size={16} />
                  <Text size="small" weight="plus" className="text-ui-fg-base">
                    Duration:
                  </Text>
                </div>
                <Text size="small" weight="plus" className="text-ui-fg-interactive">
                  {(() => {
                    const durationMs = endDate.getTime() - startDate.getTime()
                    const hours = Math.floor(durationMs / (1000 * 60 * 60))
                    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
                    const days = Math.floor(hours / 24)
                    
                    if (days > 0) {
                      const remainingHours = hours % 24
                      return remainingHours > 0 
                        ? `${days}d ${remainingHours}h` 
                        : `${days}d`
                    }
                    
                    if (hours > 0) {
                      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
                    }
                    
                    return `${minutes}m`
                  })()}
                </Text>
              </div>
            )}

            <div className="flex flex-col space-y-2">
              <Label htmlFor="start-date" size="small" weight="plus">
                Start Date & Time
              </Label>
              <DatePicker
                value={startDate}
                onChange={handleStartDateChange}
                showTimePicker
                placeholder="Select start date and time"
              />
              <Text size="xsmall" className="text-ui-fg-subtle">
                When the service order should start
              </Text>
            </div>

            <div className="flex flex-col space-y-2">
              <Label htmlFor="end-date" size="small" weight="plus">
                End Date & Time
              </Label>
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                showTimePicker
                placeholder="Select end date and time"
                minDate={startDate}
              />
              <Text size="xsmall" className="text-ui-fg-subtle">
                When the service order should be completed
              </Text>
            </div>

            {(startDate || endDate) && (
              <Button
                size="small"
                variant="secondary"
                onClick={handleClearSchedule}
                className="self-start"
              >
                Clear Schedule
              </Button>
            )}

            <div className="flex items-center justify-end gap-x-2 pt-4 border-t">
              <Button
                size="small"
                variant="secondary"
                type="button"
                onClick={handleCancel}
                disabled={updateScheduleMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                size="small"
                type="button"
                onClick={handleSave}
                isLoading={updateScheduleMutation.isPending}
              >
                Save Schedule
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-6 py-4">
          <div className="flex flex-col gap-y-4">
            {isScheduled ? (
              <>
                <div className="flex flex-col space-y-1">
                  <Label size="small" weight="plus">
                    Scheduled Start
                  </Label>
                  <Text size="small">
                    {formatDateTime(serviceOrder.scheduled_start_date)}
                  </Text>
                </div>

                <div className="flex flex-col space-y-1">
                  <Label size="small" weight="plus">
                    Scheduled End
                  </Label>
                  <Text size="small">
                    {formatDateTime(serviceOrder.scheduled_end_date)}
                  </Text>
                </div>

                <div className="flex flex-col space-y-1">
                  <Label size="small" weight="plus">
                    Duration
                  </Label>
                  <Text size="small">
                    {(() => {
                      if (!serviceOrder.scheduled_start_date || !serviceOrder.scheduled_end_date) {
                        return 'N/A'
                      }
                      const start = new Date(serviceOrder.scheduled_start_date)
                      const end = new Date(serviceOrder.scheduled_end_date)
                      const durationMs = end.getTime() - start.getTime()
                      const hours = Math.floor(durationMs / (1000 * 60 * 60))
                      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
                      const days = Math.floor(hours / 24)
                      
                      if (days > 0) {
                        const remainingHours = hours % 24
                        return remainingHours > 0 
                          ? `${days}d ${remainingHours}h` 
                          : `${days}d`
                      }
                      
                      if (hours > 0) {
                        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
                      }
                      
                      return `${minutes}m`
                    })()}
                  </Text>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <Calendar className="text-ui-fg-muted mb-2" size={32} />
                <Text size="small" className="text-ui-fg-muted">
                  No schedule set
                </Text>
                <Text size="xsmall" className="text-ui-fg-subtle mt-1">
                  Click edit to schedule this service order
                </Text>
              </div>
            )}
          </div>
        </div>
      )}
    </Container>
  )
}

export default ServiceOrderScheduleWidget

