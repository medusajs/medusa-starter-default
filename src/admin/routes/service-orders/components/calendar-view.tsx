/**
 * TEM-249: CalendarView base component
 * TEM-254: Added drag-and-drop drop zone handlers
 * TEM-255: Integrated date calculation utilities
 * 
 * Main calendar component that renders the calendar grid and manages view state.
 * Supports month, week, and day views with native MedusaJS UI patterns.
 * Handles drag-and-drop rescheduling of service orders.
 */

import React, { useState, useMemo } from "react"
import { Container, Heading } from "@medusajs/ui"
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  addWeeks,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  startOfDay,
  endOfDay,
} from "date-fns"

// Import sub-components (will be created in subsequent tickets)
import { CalendarToolbar } from "./calendar-toolbar"
import { CalendarEvent } from "./calendar-event"

// TEM-255: Import date calculation utilities
import { calculateNewDates } from "../utils/calendar-utils"

// TEM-258: Import validation utilities
import { validateScheduleChange } from "../utils/schedule-validation"
import { toast } from "@medusajs/ui"

// Types
interface ServiceOrder {
  id: string
  service_order_number: string
  scheduled_start_date: string
  scheduled_end_date: string
  status: string
  priority: string
  technician_id: string | null
  customer_id: string
  service_type: string
  description: string
}

interface CalendarViewProps {
  events: ServiceOrder[]
  isLoading: boolean
  onEventClick?: (order: ServiceOrder) => void
  onEventDrop?: (serviceOrderId: string, newStartDate: Date, newEndDate: Date) => void
  onEventResize?: (serviceOrderId: string, newEndDate: Date) => void
}

type CalendarView = 'month' | 'week' | 'day'

export const CalendarView = ({ events, isLoading, onEventClick, onEventDrop, onEventResize }: CalendarViewProps) => {
  // TEM-249: State management for calendar view
  const [view, setView] = useState<CalendarView>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  
  // TEM-254: State for drag-over visual feedback
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)

  // TEM-249: Navigation handlers
  const handleNavigate = (action: 'prev' | 'next' | 'today') => {
    if (action === 'today') {
      setCurrentDate(new Date())
    } else if (action === 'prev') {
      if (view === 'month') {
        setCurrentDate(addMonths(currentDate, -1))
      } else if (view === 'week') {
        setCurrentDate(addWeeks(currentDate, -1))
      } else {
        setCurrentDate(addDays(currentDate, -1))
      }
    } else if (action === 'next') {
      if (view === 'month') {
        setCurrentDate(addMonths(currentDate, 1))
      } else if (view === 'week') {
        setCurrentDate(addWeeks(currentDate, 1))
      } else {
        setCurrentDate(addDays(currentDate, 1))
      }
    }
  }

  // TEM-254: Handle drag over - allow drop and show visual feedback
  const handleDragOver = (e: React.DragEvent, dateKey: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverDate(dateKey)
  }

  // TEM-254: Handle drag leave - remove visual feedback
  const handleDragLeave = () => {
    setDragOverDate(null)
  }

  // TEM-254: Handle drop - extract data and call parent handler
  // TEM-255: Calculate new dates preserving duration
  // TEM-258: Add validation before allowing drop
  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault()
    setDragOverDate(null)

    const serviceOrderId = e.dataTransfer.getData('serviceOrderId')
    const serviceOrderDataStr = e.dataTransfer.getData('serviceOrderData')

    if (serviceOrderId && serviceOrderDataStr && onEventDrop) {
      try {
        const originalData = JSON.parse(serviceOrderDataStr)
        
        // TEM-255: Calculate new dates preserving the event duration
        const { newStartDate, newEndDate } = calculateNewDates(
          new Date(originalData.scheduled_start_date),
          new Date(originalData.scheduled_end_date),
          targetDate
        )
        
        // TEM-258: Find the service order for validation
        const serviceOrder = events.find(e => e.id === serviceOrderId)
        
        // TEM-258: Validate the schedule change
        const validation = validateScheduleChange(
          serviceOrder || null,
          newStartDate,
          newEndDate
        )
        
        // TEM-258: Block if there are errors
        if (!validation.isValid) {
          toast.error('Cannot reschedule service order', {
            description: validation.errors.join(', '),
          })
          return
        }
        
        // TEM-258: Show warnings but allow the operation
        if (validation.warnings.length > 0) {
          toast.warning('Schedule change warning', {
            description: validation.warnings.join(', '),
          })
        }
        
        // TEM-255: Pass calculated dates to parent handler
        onEventDrop(serviceOrderId, newStartDate, newEndDate)
      } catch (error) {
        console.error('Failed to parse service order data:', error)
        toast.error('Failed to reschedule', {
          description: 'An unexpected error occurred',
        })
      }
    }
  }

  // TEM-249: Calculate date range for current view
  const dateRange = useMemo(() => {
    if (view === 'month') {
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)
      const start = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday
      const end = endOfWeek(monthEnd, { weekStartsOn: 1 })
      return { start, end }
    } else if (view === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 })
      const end = endOfWeek(currentDate, { weekStartsOn: 1 })
      return { start, end }
    } else {
      const start = startOfDay(currentDate)
      const end = endOfDay(currentDate)
      return { start, end }
    }
  }, [currentDate, view])

  // TEM-249: Generate calendar days
  const calendarDays = useMemo(() => {
    const days: Date[] = []
    let day = dateRange.start
    
    while (day <= dateRange.end) {
      days.push(day)
      day = addDays(day, 1)
    }
    
    return days
  }, [dateRange])

  // TEM-249: Group events by date for efficient rendering
  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, ServiceOrder[]>()
    
    events.forEach(event => {
      const startDate = new Date(event.scheduled_start_date)
      const endDate = new Date(event.scheduled_end_date)
      
      // Add event to all days it spans
      let currentDay = startOfDay(startDate)
      const lastDay = startOfDay(endDate)
      
      while (currentDay <= lastDay) {
        const dateKey = format(currentDay, 'yyyy-MM-dd')
        if (!grouped.has(dateKey)) {
          grouped.set(dateKey, [])
        }
        grouped.get(dateKey)!.push(event)
        currentDay = addDays(currentDay, 1)
      }
    })
    
    return grouped
  }, [events])

  // TEM-249: Render month view grid
  const renderMonthView = () => {
    const weeks: Date[][] = []
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7))
    }

    return (
      <div className="calendar-month-view">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-px bg-ui-border-base border-b">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div
              key={day}
              className="bg-ui-bg-base p-2 text-center text-xs font-medium text-ui-fg-subtle"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px bg-ui-border-base">
          {calendarDays.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd')
            const dayEvents = eventsByDate.get(dateKey) || []
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isDayToday = isToday(day)
            const isDragOver = dragOverDate === dateKey

            return (
              <div
                key={dateKey}
                onDragOver={(e) => handleDragOver(e, dateKey)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, day)}
                className={`
                  bg-ui-bg-base min-h-[120px] p-2 transition-colors
                  ${!isCurrentMonth ? 'text-ui-fg-disabled' : ''}
                  ${isDayToday ? 'bg-ui-bg-highlight' : ''}
                  ${isDragOver ? 'bg-ui-bg-highlight-hover ring-2 ring-ui-fg-interactive' : ''}
                `}
              >
                {/* Date number */}
                <div className={`
                  text-sm font-medium mb-1
                  ${isDayToday ? 'text-ui-fg-interactive' : ''}
                `}>
                  {format(day, 'd')}
                </div>

                {/* Events for this day */}
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map(event => (
                    <CalendarEvent
                      key={event.id}
                      serviceOrder={event}
                      onClick={() => onEventClick?.(event)}
                      onResize={onEventResize}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-ui-fg-subtle px-1">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // TEM-249: Render week view (simplified for now)
  const renderWeekView = () => {
    return (
      <div className="calendar-week-view">
        <div className="text-center text-ui-fg-subtle py-8">
          Week view - Coming in Phase 3
        </div>
      </div>
    )
  }

  // TEM-249: Render day view (simplified for now)
  // TEM-254: Added drop zone support
  const renderDayView = () => {
    const dateKey = format(currentDate, 'yyyy-MM-dd')
    const dayEvents = eventsByDate.get(dateKey) || []
    const isDragOver = dragOverDate === dateKey

    return (
      <div 
        className={`calendar-day-view p-4 transition-colors ${isDragOver ? 'bg-ui-bg-highlight' : ''}`}
        onDragOver={(e) => handleDragOver(e, dateKey)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, currentDate)}
      >
        <Heading level="h3" className="mb-4">
          {format(currentDate, 'EEEE, MMMM d, yyyy')}
        </Heading>
        <div className="space-y-2">
          {dayEvents.length === 0 ? (
            <div className="text-center text-ui-fg-subtle py-8">
              No service orders scheduled for this day
            </div>
          ) : (
            dayEvents.map(event => (
              <CalendarEvent
                key={event.id}
                serviceOrder={event}
                onClick={() => onEventClick?.(event)}
                onResize={onEventResize}
              />
            ))
          )}
        </div>
      </div>
    )
  }

  // TEM-249: Loading state
  if (isLoading) {
    return (
      <Container className="p-6">
        <div className="text-center text-ui-fg-subtle py-8">
          Loading calendar...
        </div>
      </Container>
    )
  }

  return (
    <Container className="p-0">
      {/* TEM-249: Calendar toolbar for navigation */}
      <CalendarToolbar
        currentDate={currentDate}
        view={view}
        onNavigate={handleNavigate}
        onViewChange={setView}
      />

      {/* TEM-249: Render appropriate view */}
      <div className="calendar-content">
        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}
      </div>
    </Container>
  )
}

