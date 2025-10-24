import React from "react"
import { useDroppable } from "@dnd-kit/core"
import { Badge, Heading, Text } from "@medusajs/ui"

// Synchronized animation timing - matches kanban-view.tsx and kanban-card.tsx
const ANIMATION_DURATION = 250 // ms
const ANIMATION_EASING = "ease-out"

type KanbanColumnProps = {
  id: string
  title: string
  color: "orange" | "blue" | "purple" | "green" | "red" | "grey"
  count: number
  children: React.ReactNode
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  title,
  color,
  count,
  children,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
  })

  return (
    <div className="flex min-w-[320px] max-w-[320px] flex-col">
      {/* Column Header */}
      <div className="mb-4 flex items-center justify-between rounded-lg bg-ui-bg-subtle p-3">
        <div className="flex items-center gap-2">
          <Heading level="h3" className="text-sm font-medium">
            {title}
          </Heading>
          <Badge size="2xsmall" color={color}>
            {count}
          </Badge>
        </div>
      </div>

      {/* Droppable Area */}
      <div
        ref={setNodeRef}
        style={{
          transition: `all ${ANIMATION_DURATION}ms ${ANIMATION_EASING}`,
        }}
        className={`flex min-h-[500px] flex-1 flex-col gap-3 rounded-lg border-2 border-dashed p-3 ${
          isOver
            ? "border-ui-border-interactive bg-ui-bg-highlight shadow-md scale-[1.01]"
            : "border-ui-border-base bg-ui-bg-subtle hover:border-ui-border-base-hover"
        }`}
      >
        {count === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <Text size="small" className="text-ui-fg-muted">
              {isOver ? "Drop here" : "No orders"}
            </Text>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
} 