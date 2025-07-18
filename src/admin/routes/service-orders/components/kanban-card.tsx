"use client"

import type React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Badge, Text, Container } from "@medusajs/ui"
import { Link } from "react-router-dom"
import { Clock, User, Tools, ChevronUpMini, ChevronDownMini, ChevronRightMini, ExclamationCircle, ArrowUpMini, ArrowDownMini } from "@medusajs/icons"

type ServiceOrder = {
  id: string
  service_order_number: string
  status: string
  priority: string
  service_type: string
  service_location: string
  description: string
  customer_id?: string | null
  technician_id?: string | null
  machine_id?: string | null
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
  updated_at: string
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

const serviceTypeVariants = {
  normal: "blue",
  warranty: "green",
  setup: "purple",
  emergency: "red",
  preventive: "orange",
} as const

const serviceLocationVariants = {
  workshop: "blue",
  customer_location: "green",
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

  // Completely disable transitions during drag to prevent return animation
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isOverlay || isDragging || isSortableDragging ? "none" : "transform 200ms ease, opacity 200ms ease",
    opacity: isDragging || isSortableDragging ? 0.4 : 1,
    // Force immediate positioning during drag
    ...(isDragging || isSortableDragging ? { 
      transform: "none",
      transition: "none" 
    } : {}),
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

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "?"
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase()
  }

  const cardContent = (
    <Container
      className={`cursor-grab touch-none select-none rounded-lg border bg-ui-bg-base shadow-sm transition-all duration-200 ease-out hover:shadow-md ${
        isOverlay ? "rotate-2 shadow-xl scale-105" : ""
      } ${isDragging || isSortableDragging ? "pointer-events-none" : ""}`}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <div className="p-4 space-y-3">
        {/* Title - Work description with service type label */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <Text size="base" weight="plus" className="leading-tight line-clamp-3 text-ui-fg-base">
              {order.description}
            </Text>
          </div>
          <div className="flex-shrink-0">
            <Badge 
              size="2xsmall" 
              color={serviceTypeVariants[order.service_type as keyof typeof serviceTypeVariants] || "grey"}
            >
              {order.service_type.charAt(0).toUpperCase() + order.service_type.slice(1)}
            </Badge>
          </div>
        </div>

        {/* Customer - More prominent display */}
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-ui-fg-muted" />
          {order.customer ? (
            <Text size="small" weight="plus" className="text-ui-fg-subtle">
              {order.customer.first_name} {order.customer.last_name}
            </Text>
          ) : (
            <Text size="small" className="text-ui-fg-muted italic">
              No customer assigned
            </Text>
          )}
        </div>

        {/* Bottom Row: Code, Service Type, Priority, Avatar */}
        <div className="flex items-center justify-between pt-2 border-t border-ui-border-base">
          {/* Left side: Service Order Code */}
          <div className="flex items-center gap-2">
            <Text size="xsmall" className="text-ui-fg-subtle font-mono" weight="plus">
              {order.service_order_number}
            </Text>
          </div>

          {/* Right side: Priority, Avatar */}
          <div className="flex items-center gap-3">
            {/* Priority Arrow */}
            <div className={`text-ui-tag-${priorityVariants[order.priority as keyof typeof priorityVariants]}-text`}>
              {(() => {
                switch (order.priority) {
                  case "urgent":
                    return <ExclamationCircle className="h-5 w-5" />
                  case "high":
                    return <ChevronUpMini className="h-5 w-5" />
                  case "normal":
                    return <ChevronRightMini className="h-5 w-5" />
                  case "low":
                    return <ChevronDownMini className="h-5 w-5" />
                  default:
                    return <ChevronRightMini className="h-5 w-5" />
                }
              })()}
            </div>

            {/* Technician Avatar */}
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-ui-bg-subtle text-ui-fg-subtle text-sm font-medium">
              {order.technician ? getInitials(order.technician.first_name, order.technician.last_name) : "?"}
            </div>
          </div>
        </div>
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