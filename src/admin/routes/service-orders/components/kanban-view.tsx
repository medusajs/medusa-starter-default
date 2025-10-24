import React, { useState, useMemo, useCallback } from "react"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverEvent,
  DropAnimation,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "@medusajs/ui"

import { KanbanColumn } from "./kanban-column"
import { KanbanCard } from "./kanban-card"
import { useCustomers, useTechnicians, createCustomerLookup, createTechnicianLookup } from "../hooks/use-service-order-data"

// Centralized animation configuration for consistent timing across all components
const ANIMATION_CONFIG = {
  DURATION: 250, // milliseconds - all animations use this duration
  EASING: "cubic-bezier(0.25, 0.46, 0.45, 0.94)", // smooth ease-in-out
  INVALIDATION_DELAY: 250, // Wait for animations to complete before refetching
} as const

// Define status constants locally to avoid potential import issues
const SERVICE_ORDER_STATUS = {
  DRAFT: "draft",
  READY_FOR_PICKUP: "ready_for_pickup",
  IN_PROGRESS: "in_progress",
  DONE: "done",
  RETURNED_FOR_REVIEW: "returned_for_review",
} as const

type ServiceOrder = {
  id: string
  service_order_number: string
  status: string
  priority: string
  service_type: string
  service_location: string
  description: string
  customer_id?: string
  technician_id?: string
  machine_id?: string
  scheduled_start_date?: string
  total_cost: number
  created_at: string
  updated_at: string
  // Enhanced fields for display
  customer?: {
    first_name: string
    last_name: string
  }
  technician?: {
    first_name: string
    last_name: string
  }
}

type KanbanViewProps = {
  serviceOrders: ServiceOrder[]
  isLoading: boolean
  onRefetch: () => void
}

const statusConfig = [
  {
    id: SERVICE_ORDER_STATUS.READY_FOR_PICKUP,
    label: "Ready for Pickup",
    color: "blue" as const,
  },
  {
    id: SERVICE_ORDER_STATUS.IN_PROGRESS,
    label: "In Progress",
    color: "purple" as const,
  },
  {
    id: SERVICE_ORDER_STATUS.DONE,
    label: "Done",
    color: "green" as const,
  },
  {
    id: SERVICE_ORDER_STATUS.RETURNED_FOR_REVIEW,
    label: "Returned for Review",
    color: "orange" as const,
  },
]

// Enhanced drop animation configuration with synchronized timing
const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.8",
      },
    },
  }),
  keyframes({ transform }) {
    return [
      { opacity: 1, transform: "scale(1.05)" },
      { opacity: 0.8, transform: "scale(0.98)" },
      { opacity: 0, transform: "scale(1)" },
    ]
  },
  easing: ANIMATION_CONFIG.EASING,
  duration: ANIMATION_CONFIG.DURATION,
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  serviceOrders,
  isLoading,
  onRefetch,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draggedOrder, setDraggedOrder] = useState<ServiceOrder | null>(null)

  // Consolidated state management - single source of truth for pending transitions
  // Structure: { orderId: { targetStatus: string, timestamp: number } }
  const [pendingTransitions, setPendingTransitions] = useState<
    Record<string, { targetStatus: string; timestamp: number }>
  >({})

  const queryClient = useQueryClient()

  // Fetch customers and technicians using shared hooks (prevents duplicate queries)
  const { data: customersData } = useCustomers()
  const { data: techniciansData } = useTechnicians()

  // Extract arrays from data - following MedusaJS native patterns
  const customers = customersData?.customers || []
  const technicians = techniciansData?.technicians || []

  // Create lookup maps for customers and technicians using shared utilities
  const customerLookup = useMemo(() => createCustomerLookup(customers), [customers])
  const technicianLookup = useMemo(() => createTechnicianLookup(technicians), [technicians])

  // Enhance service orders with customer and technician data
  const enhancedServiceOrders = useMemo(() => {
    return serviceOrders.map(order => ({
      ...order,
      customer: order.customer_id ? customerLookup.get(order.customer_id) : null,
      technician: order.technician_id ? technicianLookup.get(order.technician_id) : null,
    }))
  }, [serviceOrders, customerLookup, technicianLookup])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before dragging starts
      },
    })
  )

  // Group orders by status with pending transitions applied
  const ordersByStatus = useMemo(() => {
    const grouped: Record<string, ServiceOrder[]> = {}

    // Initialize all status groups
    statusConfig.forEach(status => {
      grouped[status.id] = []
    })

    // Group orders by their status, applying pending transitions for optimistic updates
    enhancedServiceOrders.forEach(order => {
      // Check if this order has a pending transition
      const pendingTransition = pendingTransitions[order.id]
      const effectiveStatus = pendingTransition?.targetStatus || order.status

      if (grouped[effectiveStatus]) {
        grouped[effectiveStatus].push({
          ...order,
          status: effectiveStatus,
        })
      }
    })

    return grouped
  }, [enhancedServiceOrders, pendingTransitions])

  // Mutation for updating order status with proper optimistic updates
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: string; newStatus: string }) => {
      const response = await fetch(`/admin/service-orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          reason: "Status updated via kanban board",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || "Failed to update status")
      }

      return response.json()
    },
    // Phase 1: Optimistic update - cancel ongoing queries and update cache directly
    onMutate: async ({ orderId, newStatus }) => {
      // Cancel any outgoing refetches to prevent them from overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["service-orders"] })

      // Snapshot all queries for potential rollback
      const previousQueries: any[] = []

      // Update ALL matching service-orders queries in the cache optimistically
      queryClient.getQueriesData({ queryKey: ["service-orders"] }).forEach(([queryKey, data]: any) => {
        if (data && data.service_orders) {
          // Store previous data for rollback
          previousQueries.push({ queryKey, data })

          // Optimistically update the cache
          queryClient.setQueryData(queryKey, {
            ...data,
            service_orders: data.service_orders.map((order: any) =>
              order.id === orderId
                ? { ...order, status: newStatus }
                : order
            ),
          })
        }
      })

      // The pendingTransitions state provides additional visual feedback during the mutation
      // Return context for error recovery
      return { previousQueries, orderId, newStatus }
    },
    // Phase 2: Success - clean up pending state and schedule data refresh
    onSuccess: (data, variables) => {
      // Immediately show success toast (while optimistic update is still visible)
      toast.success("Service order status updated successfully!")

      // Schedule invalidation and cleanup after animation completes
      // The optimistic cache update ensures the card stays in the correct position
      setTimeout(() => {
        // Clear the pending transition for this order
        setPendingTransitions(prev => {
          const { [variables.orderId]: removed, ...rest } = prev
          return rest
        })

        // Single targeted invalidation - refetch to get any other changes from server
        queryClient.invalidateQueries({
          queryKey: ["service-orders"],
          exact: false,
          refetchType: 'active', // Only refetch currently mounted queries
        })
      }, ANIMATION_CONFIG.INVALIDATION_DELAY)
    },
    // Phase 3: Error - rollback optimistic update and restore previous state
    onError: (error: Error, variables, context) => {
      toast.error(`Failed to update status: ${error.message}`)

      // Clear the pending transition
      setPendingTransitions(prev => {
        const { [variables.orderId]: removed, ...rest } = prev
        return rest
      })

      // Rollback ALL queries to previous state
      if (context?.previousQueries) {
        context.previousQueries.forEach(({ queryKey, data }: any) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
  })

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as string)

    // Find the dragged order
    const order = serviceOrders.find(o => o.id === active.id)
    setDraggedOrder(order || null)
  }, [serviceOrders])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    // Optional: Add visual feedback here if needed
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    // Clear drag state
    setActiveId(null)
    setDraggedOrder(null)

    if (!over || !active) {
      return
    }

    const orderId = active.id as string
    const overId = over.id as string

    // Determine the target status:
    // - If dropped on a column (status ID), use it directly
    // - If dropped on a card, find which column that card belongs to
    let newStatus = overId

    // Check if overId is a valid status from statusConfig
    const isValidStatus = statusConfig.some(s => s.id === overId)

    if (!isValidStatus) {
      // overId is likely a card ID, find which column it belongs to
      const targetOrder = serviceOrders.find(o => o.id === overId)
      if (targetOrder) {
        newStatus = targetOrder.status
      } else {
        // Fallback: search in ordersByStatus to find the column
        for (const [status, orders] of Object.entries(ordersByStatus)) {
          if (orders.some(o => o.id === overId)) {
            newStatus = status
            break
          }
        }
      }

      // Safety check: ensure we found a valid status
      if (!statusConfig.some(s => s.id === newStatus)) {
        console.error('Failed to determine target status:', { overId, newStatus })
        toast.error('Failed to determine target column')
        return
      }
    }

    // Find the current order
    const currentOrder = serviceOrders.find(o => o.id === orderId)
    if (!currentOrder || currentOrder.status === newStatus) {
      return
    }

    // Apply optimistic update immediately for instant visual feedback
    setPendingTransitions(prev => ({
      ...prev,
      [orderId]: {
        targetStatus: newStatus,
        timestamp: Date.now(),
      },
    }))

    // Trigger the API mutation
    updateStatusMutation.mutate({ orderId, newStatus })
  }, [serviceOrders, updateStatusMutation, ordersByStatus])

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-ui-fg-subtle">Loading kanban board...</div>
      </div>
    )
  }

  return (
    <div className="h-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 overflow-x-auto pb-4">
          {statusConfig.map((status) => {
            const orders = ordersByStatus[status.id] || []

            return (
              <KanbanColumn
                key={status.id}
                id={status.id}
                title={status.label}
                color={status.color}
                count={orders.length}
              >
                <SortableContext
                  items={orders.map(o => o.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {orders.map((order) => (
                    <KanbanCard
                      key={order.id}
                      order={order}
                      isDragging={activeId === order.id}
                      isPending={!!pendingTransitions[order.id]}
                    />
                  ))}
                </SortableContext>
              </KanbanColumn>
            )
          })}
        </div>

        <DragOverlay dropAnimation={dropAnimationConfig}>
          {draggedOrder ? (
            <KanbanCard
              order={draggedOrder}
              isDragging={true}
              isOverlay={true}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
