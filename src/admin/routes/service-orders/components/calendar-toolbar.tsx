/**
 * TEM-251: CalendarToolbar navigation component
 * 
 * Toolbar for calendar navigation and view switching with:
 * - Previous/Next/Today navigation buttons
 * - Current date display
 * - View switcher (month/week/day)
 * - Uses native MedusaJS UI components
 */

import React from "react"
import { Button, Heading } from "@medusajs/ui"
import { ChevronLeft, ChevronRight } from "@medusajs/icons"
import { format } from "date-fns"

// Types
interface CalendarToolbarProps {
  currentDate: Date
  view: 'month' | 'week' | 'day'
  onNavigate: (action: 'prev' | 'next' | 'today') => void
  onViewChange: (view: 'month' | 'week' | 'day') => void
}

// TEM-251: Main CalendarToolbar component
export const CalendarToolbar = ({
  currentDate,
  view,
  onNavigate,
  onViewChange,
}: CalendarToolbarProps) => {
  // TEM-251: Format date display based on current view
  const getDateDisplay = () => {
    if (view === 'month') {
      return format(currentDate, 'MMMM yyyy')
    } else if (view === 'week') {
      return format(currentDate, "'Week of' MMM d, yyyy")
    } else {
      return format(currentDate, 'EEEE, MMMM d, yyyy')
    }
  }

  return (
    <div className="calendar-toolbar flex items-center justify-between p-4 border-b border-ui-border-base">
      {/* TEM-251: Navigation buttons */}
      <div className="flex gap-2">
        <Button
          size="small"
          variant="secondary"
          onClick={() => onNavigate('prev')}
          aria-label="Previous"
        >
          <ChevronLeft />
        </Button>
        <Button
          size="small"
          variant="secondary"
          onClick={() => onNavigate('today')}
        >
          Today
        </Button>
        <Button
          size="small"
          variant="secondary"
          onClick={() => onNavigate('next')}
          aria-label="Next"
        >
          <ChevronRight />
        </Button>
      </div>

      {/* TEM-251: Current date display */}
      <Heading level="h2" className="text-ui-fg-base">
        {getDateDisplay()}
      </Heading>

      {/* TEM-251: View switcher using button group */}
      <div className="flex gap-1 bg-ui-bg-subtle rounded p-1">
        <Button
          size="small"
          variant={view === 'month' ? 'primary' : 'transparent'}
          onClick={() => onViewChange('month')}
        >
          Month
        </Button>
        <Button
          size="small"
          variant={view === 'week' ? 'primary' : 'transparent'}
          onClick={() => onViewChange('week')}
        >
          Week
        </Button>
        <Button
          size="small"
          variant={view === 'day' ? 'primary' : 'transparent'}
          onClick={() => onViewChange('day')}
        >
          Day
        </Button>
      </div>
    </div>
  )
}

