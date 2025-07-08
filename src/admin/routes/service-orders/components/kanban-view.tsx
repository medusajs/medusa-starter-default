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
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "@medusajs/ui"

import { KanbanColumn } from "./kanban-column"
import { KanbanCard } from "./kanban-card"
import { ServiceOrderStatus } from "../../../../modules/service-orders/models/service-order"

type ServiceOrder = {
  id: string
  service_order_number: string
  status: string
  priority: string
  description: string
  customer?: {
    first_name: string
    last_name: string
  }
  technician?: {
    first_name: string
    last_name: string
  }
  scheduled_start_date?: string
  total_cost: number
  created_at: string
}

type KanbanViewProps = {
  serviceOrders: ServiceOrder[]
  isLoading: boolean
  onRefetch: () => void
}

const statusConfig = [
  {
    id: ServiceOrderStatus.DRAFT,
    label: "Draft",
    color: "orange" as const,
  },
  {
    id: ServiceOrderStatus.SCHEDULED,
    label: "Scheduled",
    color: "blue" as const,
  },
  {
    id: ServiceOrderStatus.IN_PROGRESS,
    label: "In Progress",
    color: "purple" as const,
  },
  {
    id: ServiceOrderStatus.WAITING_PARTS,
    label: "Waiting for Parts",
    color: "orange" as const,
  },
  {
    id: ServiceOrderStatus.CUSTOMER_APPROVAL,
    label: "Customer Approval",
    color: "orange" as const,
  },
  {
    id: ServiceOrderStatus.COMPLETED,
    label: "Completed",
    color: "green" as const,
  },
  {
    id: ServiceOrderStatus.CANCELLED,
    label: "Cancelled",
    color: "red" as const,
  },
]

export const KanbanView: React.FC<KanbanViewProps> = ({
  serviceOrders,
  isLoading,
  onRefetch,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draggedOrder, setDraggedOrder] = useState<ServiceOrder | null>(null)
  const queryClient = useQueryClient()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before dragging starts
      },
    })
  )

  // Group orders by status
  const ordersByStatus = useMemo(() => {
    const grouped: Record<string, ServiceOrder[]> = {}
    
    // Initialize all status groups
    statusConfig.forEach(status => {
      grouped[status.id] = []
    })
    
    // Group orders by their status
    serviceOrders.forEach(order => {
      if (grouped[order.status]) {
        grouped[order.status].push(order)
      }
    })
    
    return grouped
  }, [serviceOrders])

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
    onSuccess: () => {
      toast.success("Service order status updated successfully!")
      onRefetch()
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`)
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
                  {orders.map((order) => (
                    <KanbanCard
                      key={order.id}
                      order={order}
                      isDragging={activeId === order.id}
                    />
                  ))}
                </SortableContext>
              </KanbanColumn>
            )
          })}
        </div>
        
        <DragOverlay>
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