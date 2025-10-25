/**
 * TEM-252: useCalendarData hook for data fetching
 * TEM-256: Added optimistic UI updates for schedule changes
 * 
 * Custom hook to fetch and manage calendar data with:
 * - Date range awareness
 * - React Query caching
 * - Support for additional filters
 * - Automatic refetching on parameter changes
 * - Optimistic updates for instant feedback
 */

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { toast } from "@medusajs/ui"

// Types
interface UseCalendarDataParams {
  startDate: Date
  endDate: Date
  filters?: {
    status?: string
    priority?: string
    technician_id?: string
    service_type?: string
  }
}

interface CalendarEvent {
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

interface CalendarDataResponse {
  events: CalendarEvent[]
  unscheduled_count: number
}

/**
 * TEM-252: Main useCalendarData hook
 * 
 * Fetches calendar data from the optimized /admin/service-orders/calendar endpoint
 * created in TEM-246.
 */
export const useCalendarData = ({ startDate, endDate, filters }: UseCalendarDataParams) => {
  const queryClient = useQueryClient()

  // TEM-252: React Query hook with automatic refetching
  const { data, isLoading, error, refetch } = useQuery<CalendarDataResponse>({
    queryKey: ['service-orders-calendar', startDate.toISOString(), endDate.toISOString(), filters],
    queryFn: async () => {
      // TEM-252: Build query parameters
      const params = new URLSearchParams({
        scheduled_start_date_gte: startDate.toISOString(),
        scheduled_end_date_lte: endDate.toISOString(),
      })

      // TEM-252: Add optional filters
      if (filters) {
        if (filters.status) {
          params.append('status', filters.status)
        }
        if (filters.priority) {
          params.append('priority', filters.priority)
        }
        if (filters.technician_id) {
          params.append('technician_id', filters.technician_id)
        }
        if (filters.service_type) {
          params.append('service_type', filters.service_type)
        }
      }

      // TEM-252: Fetch from calendar endpoint (TEM-246)
      const response = await fetch(`/admin/service-orders/calendar?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch calendar data')
      }

      return response.json()
    },
    // TEM-252: Cache for 30 seconds to reduce API calls
    staleTime: 30000,
    // TEM-252: Keep data in cache for 5 minutes
    gcTime: 5 * 60 * 1000,
  })

  return {
    // TEM-252: Return events array (empty if no data)
    events: data?.events || [],
    // TEM-252: Return unscheduled count
    unscheduledCount: data?.unscheduled_count || 0,
    // TEM-252: Loading and error states
    isLoading,
    error,
    // TEM-252: Manual refetch function
    refetch,
  }
}

// TEM-256: Types for schedule update mutation
interface UpdateScheduleParams {
  serviceOrderId: string
  newStartDate: Date
  newEndDate: Date
}

/**
 * TEM-256: Hook for updating service order schedule with optimistic updates
 * 
 * Provides instant visual feedback by updating the UI immediately,
 * then rolls back if the API call fails.
 */
export const useUpdateSchedule = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      serviceOrderId, 
      newStartDate, 
      newEndDate 
    }: UpdateScheduleParams) => {
      // TEM-256: Call the schedule update API endpoint
      const response = await fetch(
        `/admin/service-orders/${serviceOrderId}/schedule`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            scheduled_start_date: newStartDate.toISOString(),
            scheduled_end_date: newEndDate.toISOString(),
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to update schedule')
      }

      return response.json()
    },
    onMutate: async (variables) => {
      // TEM-256: Cancel any outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: ['service-orders-calendar'] })

      // TEM-256: Snapshot the previous value for rollback
      const previousData = queryClient.getQueryData(['service-orders-calendar'])

      // TEM-256: Optimistically update the cache
      queryClient.setQueriesData(
        { queryKey: ['service-orders-calendar'] },
        (old: any) => {
          if (!old) return old

          return {
            ...old,
            events: old.events.map((event: CalendarEvent) =>
              event.id === variables.serviceOrderId
                ? {
                    ...event,
                    scheduled_start_date: variables.newStartDate.toISOString(),
                    scheduled_end_date: variables.newEndDate.toISOString(),
                  }
                : event
            ),
          }
        }
      )

      // TEM-256: Return context for rollback
      return { previousData }
    },
    onError: (error, variables, context) => {
      // TEM-256: Rollback to previous data on error
      if (context?.previousData) {
        queryClient.setQueryData(['service-orders-calendar'], context.previousData)
      }

      // TEM-256: Show error toast
      toast.error('Failed to update schedule', {
        description: error instanceof Error ? error.message : 'An error occurred',
      })
    },
    onSuccess: () => {
      // TEM-256: Show success toast
      toast.success('Schedule updated successfully')
    },
    onSettled: () => {
      // TEM-256: Refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['service-orders-calendar'] })
    },
  })
}

// TEM-257: Types for resize mutation (will be implemented in TEM-257)
interface ResizeEventParams {
  serviceOrderId: string
  newEndDate: Date
}

/**
 * TEM-257: Hook for resizing service order events (updating end date)
 * 
 * Similar to useUpdateSchedule but only updates the end date.
 */
export const useResizeEvent = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ serviceOrderId, newEndDate }: ResizeEventParams) => {
      // TEM-257: Call the schedule update API endpoint
      const response = await fetch(
        `/admin/service-orders/${serviceOrderId}/schedule`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            scheduled_end_date: newEndDate.toISOString(),
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to resize event')
      }

      return response.json()
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['service-orders-calendar'] })
      const previousData = queryClient.getQueryData(['service-orders-calendar'])

      queryClient.setQueriesData(
        { queryKey: ['service-orders-calendar'] },
        (old: any) => {
          if (!old) return old

          return {
            ...old,
            events: old.events.map((event: CalendarEvent) =>
              event.id === variables.serviceOrderId
                ? {
                    ...event,
                    scheduled_end_date: variables.newEndDate.toISOString(),
                  }
                : event
            ),
          }
        }
      )

      return { previousData }
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['service-orders-calendar'], context.previousData)
      }

      toast.error('Failed to resize event', {
        description: error instanceof Error ? error.message : 'An error occurred',
      })
    },
    onSuccess: () => {
      toast.success('Event resized successfully')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders-calendar'] })
    },
  })
}

