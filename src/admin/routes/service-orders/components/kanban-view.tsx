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
import { CSS } from "@dnd-kit/utilities"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { toast } from "@medusajs/ui"

import { KanbanColumn } from "./kanban-column"
import { KanbanCard } from "./kanban-card"

// Hook to fetch customers for display
const useCustomers = () => {
  return useQuery({
    queryKey: ["service-orders-customers"],
    queryFn: async () => {
      const response = await fetch(`/admin/customers?limit=1000`)
      if (!response.ok) throw new Error("Failed to fetch customers")
      const data = await response.json()
      return {
        customers: data.customers || [],
        count: data.count || 0
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Hook to fetch technicians for display
const useTechnicians = () => {
  return useQuery({
    queryKey: ["service-orders-technicians"],
    queryFn: async () => {
      const response = await fetch(`/admin/technicians?limit=1000`)
      if (!response.ok) throw new Error("Failed to fetch technicians")
      const data = await response.json()
      return {
        technicians: data.technicians || [],
        count: data.count || 0
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

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

// Enhanced drop animation configuration for smoother transitions
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
      { opacity: 0.8, transform: "scale(0.95)" },
      { opacity: 0, transform: "scale(1)" },
    ]
  },
  easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
  duration: 150,
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  serviceOrders,
  isLoading,
  onRefetch,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draggedOrder, setDraggedOrder] = useState<ServiceOrder | null>(null)
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, string>>({})
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()

  // Fetch customers and technicians for lookup
  const { data: customersData } = useCustomers()
  const { data: techniciansData } = useTechnicians()

  // Extract arrays from data - following MedusaJS native patterns
  const customers = customersData?.customers || []
  const technicians = techniciansData?.technicians || []

  // Create lookup maps for customers and technicians
  const customerLookup = useMemo(() => {
    const map = new Map()
    // Ensure customers is an array before calling forEach
    if (Array.isArray(customers)) {
      customers.forEach((customer: any) => {
        map.set(customer.id, customer)
      })
    }
    return map
  }, [customers])

  const technicianLookup = useMemo(() => {
    const map = new Map()
    // Ensure technicians is an array before calling forEach
    if (Array.isArray(technicians)) {
      technicians.forEach((technician: any) => {
        map.set(technician.id, technician)
      })
    }
    return map
  }, [technicians])

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

  // Group orders by status with optimistic updates
  const ordersByStatus = useMemo(() => {
    const grouped: Record<string, ServiceOrder[]> = {}
    
    // Initialize all status groups
    statusConfig.forEach(status => {
      grouped[status.id] = []
    })
    
    // Debug: Track orders that don't match any status
    const unmatchedOrders: ServiceOrder[] = []
    
    // Group orders by their status, applying optimistic updates
    enhancedServiceOrders.forEach(order => {
      const effectiveStatus = optimisticUpdates[order.id] || order.status
      if (grouped[effectiveStatus]) {
        grouped[effectiveStatus].push({
          ...order,
          status: effectiveStatus,
        })
      } else {
        // Log orders with unexpected statuses
        unmatchedOrders.push(order)
      }
    })
    
    // Debug logging for troubleshooting
    if (unmatchedOrders.length > 0) {
      console.warn('⚠️ Kanban View: Found service orders with statuses not in statusConfig:', {
        unmatchedOrders: unmatchedOrders.map(o => ({ 
          id: o.id, 
          status: o.status, 
          service_order_number: o.service_order_number 
        })),
        availableStatuses: statusConfig.map(s => s.id),
        totalOrders: enhancedServiceOrders.length,
        groupedOrders: Object.entries(grouped).map(([status, orders]) => ({ status, count: orders.length }))
      })
    }
    
    return grouped
  }, [enhancedServiceOrders, optimisticUpdates])

  // Mutation for updating order status
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
    onSuccess: (data, variables) => {
      toast.success("Service order status updated successfully!")
      
      // Clear optimistic update and pending state
      setOptimisticUpdates(prev => {
        const { [variables.orderId]: removed, ...rest } = prev
        return rest
      })
      setPendingUpdates(prev => {
        const newSet = new Set(prev)
        newSet.delete(variables.orderId)
        return newSet
      })
      
      onRefetch()
      
      // Invalidate all service order related queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["service-orders"] })
      queryClient.invalidateQueries({ queryKey: ["service-order", variables.orderId] })
      
      // Also invalidate any queries that might contain service order data
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === "service-orders" || 
          (Array.isArray(query.queryKey) && query.queryKey[0] === "service-order")
      })
    },
    onError: (error: Error, variables) => {
      toast.error(`Failed to update status: ${error.message}`)
      
      // Clear optimistic update and pending state on error
      setOptimisticUpdates(prev => {
        const { [variables.orderId]: removed, ...rest } = prev
        return rest
      })
      setPendingUpdates(prev => {
        const newSet = new Set(prev)
        newSet.delete(variables.orderId)
        return newSet
      })
      
      onRefetch() // Refresh to revert optimistic update
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
    // We can add visual feedback here if needed
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over || !active) {
      setActiveId(null)
      setDraggedOrder(null)
      return
    }
    
    const orderId = active.id as string
    const newStatus = over.id as string
    
    // Find the current order
    const currentOrder = serviceOrders.find(o => o.id === orderId)
    if (!currentOrder || currentOrder.status === newStatus) {
      setActiveId(null)
      setDraggedOrder(null)
      return
    }
    
    // Apply optimistic update immediately for instant visual feedback
    setOptimisticUpdates(prev => ({
      ...prev,
      [orderId]: newStatus,
    }))
    
    // Add to pending updates for loading state
    setPendingUpdates(prev => new Set(prev).add(orderId))
    
    // Clear drag state with slight delay to allow drop animation to complete
    setTimeout(() => {
      setActiveId(null)
      setDraggedOrder(null)
    }, 150)
    
    // Update status via API
    updateStatusMutation.mutate({ orderId, newStatus })
  }, [serviceOrders, updateStatusMutation])

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
                      isPending={pendingUpdates.has(order.id)}
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