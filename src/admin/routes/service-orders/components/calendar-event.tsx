/**
 * TEM-250: CalendarEvent component for service orders
 * TEM-254: Added drag-and-drop functionality
 * TEM-257: Added resize functionality
 * TEM-258: Added validation for schedule changes
 * 
 * Renders individual service order events in the calendar with:
 * - Status-based color coding
 * - Priority indication via border
 * - Hover effects
 * - Truncated text display
 * - Drag-and-drop support for rescheduling
 * - Resize handles for duration changes
 * - Validation to prevent invalid operations
 */

import React, { useState } from "react"
import { Badge, toast } from "@medusajs/ui"
import { validateResize } from "../utils/schedule-validation"

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

interface CalendarEventProps {
  serviceOrder: ServiceOrder
  onClick?: () => void
  onResize?: (serviceOrderId: string, newEndDate: Date) => void
  style?: React.CSSProperties
}

// TEM-250: Helper function to get status color
const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    draft: '#9CA3AF', // Gray
    ready_for_pickup: '#3B82F6', // Blue
    in_progress: '#F59E0B', // Amber/Yellow
    done: '#10B981', // Green
    returned_for_review: '#EF4444', // Red
  }
  return colors[status] || colors.draft
}

// TEM-250: Helper function to get priority color
const getPriorityColor = (priority: string): string => {
  const colors: Record<string, string> = {
    low: '#6B7280', // Gray
    normal: '#3B82F6', // Blue
    high: '#F59E0B', // Orange
    urgent: '#EF4444', // Red
  }
  return colors[priority] || colors.normal
}

// TEM-250: Helper function to truncate text
const truncate = (text: string, maxLength: number): string => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// TEM-250: Helper function to get status label
const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    draft: 'Draft',
    ready_for_pickup: 'Ready',
    in_progress: 'In Progress',
    done: 'Done',
    returned_for_review: 'Review',
  }
  return labels[status] || status
}

// TEM-250: Main CalendarEvent component
// TEM-254: Added drag-and-drop handlers
// TEM-257: Added resize functionality
export const CalendarEvent = ({ serviceOrder, onClick, onResize, style }: CalendarEventProps) => {
  const statusColor = getStatusColor(serviceOrder.status)
  const priorityColor = getPriorityColor(serviceOrder.priority)
  
  // TEM-254: State for drag feedback
  const [isDragging, setIsDragging] = useState(false)
  
  // TEM-257: State for resize feedback
  const [isResizing, setIsResizing] = useState(false)

  // TEM-254: Handle drag start - store service order ID in dataTransfer
  const handleDragStart = (e: React.DragEvent) => {
    // TEM-257: Don't start drag if resizing
    if (isResizing) {
      e.preventDefault()
      return
    }
    
    e.dataTransfer.setData('serviceOrderId', serviceOrder.id)
    e.dataTransfer.setData('serviceOrderData', JSON.stringify({
      id: serviceOrder.id,
      scheduled_start_date: serviceOrder.scheduled_start_date,
      scheduled_end_date: serviceOrder.scheduled_end_date,
    }))
    e.dataTransfer.effectAllowed = 'move'
    setIsDragging(true)
  }

  // TEM-254: Handle drag end - reset visual state
  const handleDragEnd = () => {
    setIsDragging(false)
  }

  // TEM-254: Prevent click event when dragging
  // TEM-257: Also prevent click when resizing
  const handleClick = (e: React.MouseEvent) => {
    if (!isDragging && !isResizing && onClick) {
      onClick()
    }
  }

  // TEM-257: Handle resize start - attach mouse move listeners
  // TEM-258: Added validation for resize operations
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent drag from starting
    e.preventDefault()
    setIsResizing(true)

    const startY = e.clientY
    const originalEnd = new Date(serviceOrder.scheduled_end_date)
    const startDate = new Date(serviceOrder.scheduled_start_date)
    let lastValidEndDate = originalEnd

    const handleMouseMove = (moveEvent: MouseEvent) => {
      // TEM-257: Calculate how many days to add/subtract based on mouse movement
      // Assuming each 40px = 1 day (approximate calendar cell height)
      const deltaY = moveEvent.clientY - startY
      const daysToAdd = Math.round(deltaY / 40)
      
      // TEM-257: Calculate new end date
      const newEndDate = new Date(originalEnd)
      newEndDate.setDate(newEndDate.getDate() + daysToAdd)
      
      // TEM-258: Validate the resize operation
      const validation = validateResize(serviceOrder, newEndDate)
      
      // TEM-258: Don't allow invalid resizes
      if (!validation.isValid) {
        return
      }
      
      // TEM-258: Store last valid end date
      lastValidEndDate = newEndDate

      // TEM-257: Call resize handler if provided
      if (onResize) {
        onResize(serviceOrder.id, newEndDate)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      
      // TEM-258: Validate final resize and show warnings
      const validation = validateResize(serviceOrder, lastValidEndDate)
      
      if (validation.warnings.length > 0) {
        toast.warning('Resize warning', {
          description: validation.warnings.join(', '),
        })
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div
      draggable={!isResizing}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      className={`
        calendar-event group cursor-move rounded px-2 py-1 text-xs transition-all 
        hover:shadow-md hover:scale-[1.02] relative
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${isResizing ? 'cursor-ns-resize' : ''}
      `}
      style={{
        backgroundColor: statusColor,
        borderLeft: `3px solid ${priorityColor}`,
        color: '#ffffff',
        ...style,
      }}
    >
      {/* TEM-250: Event title with order number */}
      <div className="event-title font-semibold truncate">
        {serviceOrder.service_order_number}
      </div>

      {/* TEM-250: Event description (truncated) */}
      <div className="event-description text-[10px] opacity-90 truncate">
        {truncate(serviceOrder.description, 30)}
      </div>

      {/* TEM-250: Status badge (visible on hover) */}
      <div className="event-status opacity-0 group-hover:opacity-100 transition-opacity mt-1">
        <span className="text-[9px] bg-white/20 px-1 py-0.5 rounded">
          {getStatusLabel(serviceOrder.status)}
        </span>
      </div>

      {/* TEM-257: Resize handle (visible on hover) */}
      {onResize && (
        <div
          className="resize-handle absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={handleResizeStart}
          style={{
            background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.3))',
          }}
        >
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-white/50 rounded-full" />
        </div>
      )}
    </div>
  )
}

