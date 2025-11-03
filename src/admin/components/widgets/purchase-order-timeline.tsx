import { Container, Heading, Badge, clx } from "@medusajs/ui"
import { CheckCircleSolid, EllipseMiniSolid } from "@medusajs/icons"

interface PurchaseOrderTimelineProps {
  data: {
    status: string
    order_date?: Date
    metadata?: {
      confirmed_at?: string
    }
    actual_delivery_date?: Date
  }
}

const STATUS_CONFIG = {
  draft: {
    label: "Draft",
    variant: "default" as const,
    order: 0,
  },
  sent: {
    label: "Sent",
    variant: "blue" as const,
    order: 1,
  },
  confirmed: {
    label: "Confirmed",
    variant: "purple" as const,
    order: 2,
  },
  partially_received: {
    label: "Partially Received",
    variant: "orange" as const,
    order: 3,
  },
  received: {
    label: "Received",
    variant: "green" as const,
    order: 4,
  },
  cancelled: {
    label: "Cancelled",
    variant: "red" as const,
    order: -1,
  },
}

const TIMELINE_STEPS = [
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "confirmed", label: "Confirmed" },
  { key: "partially_received", label: "Receiving" },
  { key: "received", label: "Complete" },
]

export const PurchaseOrderTimeline = ({ data }: PurchaseOrderTimelineProps) => {
  const currentStatus = data.status
  const currentOrder = STATUS_CONFIG[currentStatus]?.order ?? 0

  // Don't show timeline for cancelled orders
  if (currentStatus === "cancelled") {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Status</Heading>
        </div>
        <div className="px-6 py-4">
          <Badge color="red" size="large">
            Cancelled
          </Badge>
        </div>
      </Container>
    )
  }

  const getStepStatus = (stepOrder: number) => {
    if (stepOrder < currentOrder) return "completed"
    if (stepOrder === currentOrder) return "current"
    return "upcoming"
  }

  const formatDate = (date?: Date | string) => {
    if (!date) return null
    const d = typeof date === "string" ? new Date(date) : date
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getStepDate = (stepKey: string) => {
    switch (stepKey) {
      case "draft":
        return formatDate(data.order_date)
      case "confirmed":
        return formatDate(data.metadata?.confirmed_at)
      case "received":
        return formatDate(data.actual_delivery_date)
      default:
        return null
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Progress</Heading>
      </div>
      <div className="px-6 py-4">
        <div className="flex flex-col gap-3">
          {TIMELINE_STEPS.map((step, index) => {
            const stepOrder = STATUS_CONFIG[step.key]?.order ?? 0
            const status = getStepStatus(stepOrder)
            const stepDate = getStepDate(step.key)

            return (
              <div key={step.key} className="flex items-start gap-3">
                {/* Step Icon */}
                <div
                  className={clx(
                    "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors flex-shrink-0",
                    {
                      "border-green-500 bg-green-500 text-white":
                        status === "completed",
                      "border-blue-500 bg-blue-500 text-white":
                        status === "current",
                      "border-gray-300 bg-white text-gray-400":
                        status === "upcoming",
                    }
                  )}
                >
                  {status === "completed" ? (
                    <CheckCircleSolid className="text-white w-3 h-3" />
                  ) : (
                    <EllipseMiniSolid
                      className={clx("w-2 h-2", {
                        "text-white": status === "current",
                        "text-gray-400": status === "upcoming",
                      })}
                    />
                  )}
                </div>

                {/* Step Label and Date */}
                <div className="flex flex-col min-w-0 flex-1">
                  <div
                    className={clx("text-sm font-medium", {
                      "text-gray-900": status !== "upcoming",
                      "text-gray-500": status === "upcoming",
                    })}
                  >
                    {step.label}
                  </div>
                  {stepDate && (
                    <div className="text-xs text-gray-500">
                      {stepDate}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Container>
  )
}
