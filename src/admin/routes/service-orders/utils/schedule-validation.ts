/**
 * TEM-258: Schedule validation utilities
 * 
 * Provides validation rules for schedule changes to prevent invalid operations:
 * - Date range validation
 * - Duration constraints
 * - Business rule enforcement
 * - Warning conditions
 */

// Types
interface ServiceOrder {
  id: string
  service_order_number: string
  scheduled_start_date: string
  scheduled_end_date: string
  status: string
  priority: string
  technician_id: string | null
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * TEM-258: Validate schedule change for a service order
 * 
 * Checks multiple validation rules and returns errors (blocking) and warnings (non-blocking).
 * 
 * @param serviceOrder - The service order being modified (optional, for context)
 * @param newStartDate - Proposed new start date
 * @param newEndDate - Proposed new end date
 * @returns ValidationResult with isValid flag, errors, and warnings
 */
export const validateScheduleChange = (
  serviceOrder: ServiceOrder | null,
  newStartDate: Date,
  newEndDate: Date
): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  // TEM-258: Rule 1 - Start date must be before end date
  if (newStartDate >= newEndDate) {
    errors.push('Start date must be before end date')
  }

  // TEM-258: Rule 2 - Cannot schedule in the past (warning only)
  const now = new Date()
  if (newStartDate < now) {
    const hoursDiff = (now.getTime() - newStartDate.getTime()) / (1000 * 60 * 60)
    if (hoursDiff > 24) {
      warnings.push(`Scheduling service order ${Math.floor(hoursDiff / 24)} days in the past`)
    } else if (hoursDiff > 1) {
      warnings.push(`Scheduling service order ${Math.floor(hoursDiff)} hours in the past`)
    }
  }

  // TEM-258: Rule 3 - Minimum duration check (30 minutes)
  const duration = newEndDate.getTime() - newStartDate.getTime()
  const minDuration = 30 * 60 * 1000 // 30 minutes in milliseconds

  if (duration < minDuration) {
    errors.push('Service order must be at least 30 minutes')
  }

  // TEM-258: Rule 4 - Maximum duration check (30 days warning)
  const maxDuration = 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds

  if (duration > maxDuration) {
    const days = Math.floor(duration / (24 * 60 * 60 * 1000))
    warnings.push(`Service order spans ${days} days (more than 30 days)`)
  }

  // TEM-258: Rule 5 - Check if order is in a state that allows rescheduling
  if (serviceOrder) {
    if (serviceOrder.status === 'done') {
      errors.push('Cannot reschedule a completed service order')
    }
  }

  // TEM-258: Rule 6 - Very long duration warning (more than 7 days)
  const weekDuration = 7 * 24 * 60 * 60 * 1000
  if (duration > weekDuration && duration <= maxDuration) {
    const days = Math.floor(duration / (24 * 60 * 60 * 1000))
    warnings.push(`Service order spans ${days} days`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * TEM-258: Validate resize operation (only end date changes)
 * 
 * Similar to validateScheduleChange but assumes start date stays the same.
 * 
 * @param serviceOrder - The service order being resized
 * @param newEndDate - Proposed new end date
 * @returns ValidationResult
 */
export const validateResize = (
  serviceOrder: ServiceOrder,
  newEndDate: Date
): ValidationResult => {
  const startDate = new Date(serviceOrder.scheduled_start_date)
  return validateScheduleChange(serviceOrder, startDate, newEndDate)
}

/**
 * TEM-258: Format validation messages for display
 * 
 * Combines errors and warnings into user-friendly messages.
 * 
 * @param result - ValidationResult from validation function
 * @returns Formatted message string
 */
export const formatValidationMessages = (result: ValidationResult): string => {
  const messages: string[] = []

  if (result.errors.length > 0) {
    messages.push('Errors:')
    result.errors.forEach(error => messages.push(`  • ${error}`))
  }

  if (result.warnings.length > 0) {
    if (messages.length > 0) messages.push('')
    messages.push('Warnings:')
    result.warnings.forEach(warning => messages.push(`  • ${warning}`))
  }

  return messages.join('\n')
}

/**
 * TEM-258: Check if dates overlap with existing events (for conflict detection)
 * 
 * This is a helper for future conflict detection features.
 * 
 * @param newStart - New start date
 * @param newEnd - New end date
 * @param existingEvents - Array of existing events to check against
 * @param excludeId - ID of event to exclude (when rescheduling itself)
 * @returns Array of conflicting events
 */
export const findConflictingEvents = (
  newStart: Date,
  newEnd: Date,
  existingEvents: ServiceOrder[],
  excludeId?: string
): ServiceOrder[] => {
  return existingEvents.filter(event => {
    // Skip the event being moved
    if (excludeId && event.id === excludeId) {
      return false
    }

    const eventStart = new Date(event.scheduled_start_date)
    const eventEnd = new Date(event.scheduled_end_date)

    // Check for overlap: events overlap if one starts before the other ends
    return newStart < eventEnd && newEnd > eventStart
  })
}

