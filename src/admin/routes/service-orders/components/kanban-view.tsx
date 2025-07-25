import React, { useState, useMemo } from "react"
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
  SCHEDULED: "scheduled",
  IN_PROGRESS: "in_progress",
  WAITING_PARTS: "waiting_parts",
  CUSTOMER_APPROVAL: "customer_approval",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
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
    id: SERVICE_ORDER_STATUS.DRAFT,
    label: "Draft",
    color: "orange" as const,
  },
  {
    id: SERVICE_ORDER_STATUS.SCHEDULED,
    label: "Scheduled",
    color: "blue" as const,
  },
  {
    id: SERVICE_ORDER_STATUS.IN_PROGRESS,
    label: "In Progress",
    color: "purple" as const,
  },
  {
    id: SERVICE_ORDER_STATUS.WAITING_PARTS,
    label: "Waiting for Parts",
    color: "orange" as const,
  },
  {
    id: SERVICE_ORDER_STATUS.CUSTOMER_APPROVAL,
    label: "Customer Approval",
    color: "orange" as const,
  },
  {
    id: SERVICE_ORDER_STATUS.COMPLETED,
    label: "Completed",
    color: "green" as const,
  },
  {
    id: SERVICE_ORDER_STATUS.CANCELLED,
    label: "Cancelled",
    color: "red" as const,
  },
]

// Drop animation configuration following Medusa patterns
const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.4",
      },
    },
  }),
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  serviceOrders,
  isLoading,
  onRefetch,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draggedOrder, setDraggedOrder] = useState<ServiceOrder | null>(null)
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, string>>({})
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({})
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
    
    // Group orders by their status, applying optimistic updates
    enhancedServiceOrders.forEach(order => {
      const effectiveStatus = optimisticUpdates[order.id] || order.status
      if (grouped[effectiveStatus]) {
        grouped[effectiveStatus].push({
          ...order,
          status: effectiveStatus,
        })
      }
    })
    
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
      
      // Clear optimistic update and updating state
      setOptimisticUpdates(prev => {
        const { [variables.orderId]: removed, ...rest } = prev
        return rest
      })
      setIsUpdating(prev => {
        const { [variables.orderId]: removed, ...rest } = prev
        return rest
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
      
      // Clear optimistic update and updating state on error
      setOptimisticUpdates(prev => {
        const { [variables.orderId]: removed, ...rest } = prev
        return rest
      })
      setIsUpdating(prev => {
        const { [variables.orderId]: removed, ...rest } = prev
        return rest
      })
      
      onRefetch() // Refresh to revert optimistic update
    },
  })

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as string)
    
    // Find the dragged order
    const order = serviceOrders.find(o => o.id === active.id)
    setDraggedOrder(order || null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    // We can add visual feedback here if needed
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    setActiveId(null)
    setDraggedOrder(null)
    
    if (!over || !active) return
    
    const orderId = active.id as string
    const newStatus = over.id as string
    
    // Find the current order
    const currentOrder = serviceOrders.find(o => o.id === orderId)
    if (!currentOrder || currentOrder.status === newStatus) return
    
    // Set updating state to prevent any animations
    setIsUpdating(prev => ({
      ...prev,
      [orderId]: true,
    }))
    
    // Apply optimistic update immediately
    setOptimisticUpdates(prev => ({
      ...prev,
      [orderId]: newStatus,
    }))
    
    // Update status via API
    updateStatusMutation.mutate({ orderId, newStatus })
  }

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
                  {orders.map((order) => {
                    // Skip rendering cards that are currently being updated to prevent return animation
                    if (isUpdating[order.id]) {
                      return null
                    }
                    
                    return (
                      <KanbanCard
                        key={order.id}
                        order={order}
                        isDragging={activeId === order.id}
                      />
                    )
                  })}
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