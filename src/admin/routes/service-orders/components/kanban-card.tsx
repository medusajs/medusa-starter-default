import React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Badge, StatusBadge, Text, Container } from "@medusajs/ui"
import { Link } from "react-router-dom"
import { Clock, User, Tools } from "@medusajs/icons"

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

type KanbanCardProps = {
  order: ServiceOrder
  isDragging?: boolean
  isOverlay?: boolean
}

const priorityVariants = {
  low: "grey",
  normal: "blue",
  high: "orange",
  urgent: "red",
} as const

export const KanbanCard: React.FC<KanbanCardProps> = ({
  order,
  isDragging = false,
  isOverlay = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: order.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isOverlay ? "none" : transition || "transform 200ms ease, opacity 200ms ease",
    opacity: isDragging || isSortableDragging ? 0.4 : 1,
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR", // Adjust for Belgium
    }).format(amount)
  }

  const cardContent = (
    <Container
      className={`cursor-grab touch-none select-none rounded-lg border bg-ui-bg-base p-4 shadow-sm transition-all duration-200 ease-out hover:shadow-md ${
        isOverlay ? "rotate-2 shadow-lg scale-105" : ""
      }`}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <Text size="small" weight="plus" className="font-mono">
            {order.service_order_number}
          </Text>
          <div className="flex items-center gap-2">
            <Badge 
              size="2xsmall" 
              color={priorityVariants[order.priority as keyof typeof priorityVariants]}
            >
              {order.priority}
            </Badge>
            <Text size="xsmall" className="text-ui-fg-subtle">
              {formatCurrency(order.total_cost)}
            </Text>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="mb-3">
        <Text size="small" className="line-clamp-2 text-ui-fg-base">
          {order.description}
        </Text>
      </div>

      {/* Customer & Technician */}
      <div className="mb-3 space-y-2">
        {order.customer && (
          <div className="flex items-center gap-2">
            <User className="h-3 w-3 text-ui-fg-muted" />
            <Text size="xsmall" className="text-ui-fg-subtle">
              {order.customer.first_name} {order.customer.last_name}
            </Text>
          </div>
        )}
        
        {order.technician ? (
          <div className="flex items-center gap-2">
            <Tools className="h-3 w-3 text-ui-fg-muted" />
            <Text size="xsmall" className="text-ui-fg-subtle">
              {order.technician.first_name} {order.technician.last_name}
            </Text>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Tools className="h-3 w-3 text-ui-fg-muted" />
            <Text size="xsmall" className="text-ui-fg-muted">
              Unassigned
            </Text>
          </div>
        )}
      </div>

      {/* Scheduled Date */}
      {order.scheduled_start_date && (
        <div className="mb-3 flex items-center gap-2">
          <Clock className="h-3 w-3 text-ui-fg-muted" />
          <Text size="xsmall" className="text-ui-fg-subtle">
            {formatDate(order.scheduled_start_date)}
          </Text>
        </div>
      )}

      {/* Footer - Created Date */}
      <div className="border-t border-ui-border-base pt-2">
        <Text size="xsmall" className="text-ui-fg-muted">
          Created {formatDate(order.created_at)}
        </Text>
      </div>
    </Container>
  )

  // If it's not an overlay, wrap with Link for navigation
  if (isOverlay) {
    return cardContent
  }

  return (
    <Link 
      to={`/service-orders/${order.id}`}
      className="block"
      onClick={(e) => {
        // Prevent navigation when dragging
        if (isDragging || isSortableDragging) {
          e.preventDefault()
        }
      }}
    >
      {cardContent}
    </Link>
  )
} 