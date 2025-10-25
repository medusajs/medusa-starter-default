/**
 * TEM-255: Calendar utility functions for date calculations
 * 
 * Provides utilities for:
 * - Calculating new dates when events are moved
 * - Preserving event duration during moves
 * - Handling multi-day events
 * - Date/time calculations for calendar operations
 */

import { startOfDay, setHours, setMinutes } from "date-fns"

/**
 * TEM-255: Calculate new start and end dates when an event is dropped
 * 
 * Preserves the duration of the event and applies it to the new start date.
 * Handles multi-day events correctly by maintaining the time difference.
 * 
 * @param originalStart - Original start date of the event
 * @param originalEnd - Original end date of the event
 * @param newStart - New start date (target drop date)
 * @returns Object with newStartDate and newEndDate
 */
export const calculateNewDates = (
  originalStart: Date,
  originalEnd: Date,
  newStart: Date
): { newStartDate: Date; newEndDate: Date } => {
  // TEM-255: Calculate duration in milliseconds
  const duration = originalEnd.getTime() - originalStart.getTime()
  
  // TEM-255: Preserve the time of day from original start
  const originalHours = originalStart.getHours()
  const originalMinutes = originalStart.getMinutes()
  
  // TEM-255: Apply time to new start date (which is typically start of day from calendar cell)
  let newStartDate = setHours(newStart, originalHours)
  newStartDate = setMinutes(newStartDate, originalMinutes)
  
  // TEM-255: Apply duration to calculate new end date
  const newEndDate = new Date(newStartDate.getTime() + duration)
  
  return {
    newStartDate,
    newEndDate,
  }
}

/**
 * TEM-255: Calculate new start date when dropping at a specific time
 * 
 * For week/day views where we might want to drop at a specific time slot.
 * 
 * @param targetDate - The date to drop on
 * @param targetHour - Optional hour to set (for time-based views)
 * @param targetMinute - Optional minute to set
 * @returns New start date with time applied
 */
export const calculateNewStartWithTime = (
  targetDate: Date,
  targetHour?: number,
  targetMinute?: number
): Date => {
  let newDate = startOfDay(targetDate)
  
  if (targetHour !== undefined) {
    newDate = setHours(newDate, targetHour)
  }
  
  if (targetMinute !== undefined) {
    newDate = setMinutes(newDate, targetMinute)
  }
  
  return newDate
}

/**
 * TEM-255: Calculate date from drop position in calendar grid
 * 
 * Determines which date cell was dropped on based on mouse position.
 * This is a helper for more advanced drop position detection.
 * 
 * @param dropX - X coordinate of drop
 * @param dropY - Y coordinate of drop
 * @param calendarBounds - Bounding rectangle of calendar container
 * @param dates - Array of dates in the calendar grid
 * @param columns - Number of columns in the grid (typically 7 for week)
 * @returns The date that was dropped on, or null if outside bounds
 */
export const calculateDateFromPosition = (
  dropX: number,
  dropY: number,
  calendarBounds: DOMRect,
  dates: Date[],
  columns: number = 7
): Date | null => {
  // TEM-255: Calculate relative position within calendar
  const relativeX = dropX - calendarBounds.left
  const relativeY = dropY - calendarBounds.top
  
  // TEM-255: Calculate cell dimensions
  const cellWidth = calendarBounds.width / columns
  const rows = Math.ceil(dates.length / columns)
  const cellHeight = calendarBounds.height / rows
  
  // TEM-255: Calculate which cell was dropped on
  const col = Math.floor(relativeX / cellWidth)
  const row = Math.floor(relativeY / cellHeight)
  
  // TEM-255: Calculate index in dates array
  const index = row * columns + col
  
  // TEM-255: Return date if valid, null otherwise
  if (index >= 0 && index < dates.length) {
    return dates[index]
  }
  
  return null
}

/**
 * TEM-255: Format duration for display
 * 
 * Helper to show event duration in human-readable format.
 * 
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Formatted duration string
 */
export const formatDuration = (startDate: Date, endDate: Date): string => {
  const durationMs = endDate.getTime() - startDate.getTime()
  const hours = Math.floor(durationMs / (1000 * 60 * 60))
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    const remainingHours = hours % 24
    if (remainingHours > 0) {
      return `${days}d ${remainingHours}h`
    }
    return `${days}d`
  }
  
  if (hours > 0) {
    if (minutes > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${hours}h`
  }
  
  return `${minutes}m`
}

/**
 * TEM-255: Check if two date ranges overlap
 * 
 * Useful for conflict detection when scheduling.
 * 
 * @param start1 - Start of first range
 * @param end1 - End of first range
 * @param start2 - Start of second range
 * @param end2 - End of second range
 * @returns True if ranges overlap
 */
export const datesOverlap = (
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean => {
  return start1 < end2 && end1 > start2
}

