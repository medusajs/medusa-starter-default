import { StatusBadge, Tooltip } from "@medusajs/ui"
import {
  PencilSquare,
  Clock,
  CheckCircleSolid,
  XCircle,
  ExclamationCircleSolid,
  ArrowPath,
} from "@medusajs/icons"
import { useCustomTranslation } from "../../hooks/use-custom-translation"

type OfferStatus = "draft" | "sent" | "accepted" | "rejected" | "expired" | "converted"

interface OfferStatusBadgeProps {
  status: OfferStatus
  showTooltip?: boolean
}

/**
 * Reusable Offer Status Badge Component
 * Shows status with icon and color-coded badge
 * Following the pattern from InvoiceStatusBadge
 */
export const OfferStatusBadge = ({
  status,
  showTooltip = true
}: OfferStatusBadgeProps) => {
  const { t } = useCustomTranslation()

  const statusConfig: Record<OfferStatus, {
    color: "grey" | "blue" | "green" | "red" | "orange" | "purple"
    icon: React.ComponentType<{ className?: string }>
    label: string
    tooltip: string
  }> = {
    draft: {
      color: "grey",
      icon: PencilSquare,
      label: t("custom.offers.status.draft"),
      tooltip: "Draft offer - can be edited and sent"
    },
    sent: {
      color: "blue",
      icon: Clock,
      label: t("custom.offers.status.sent"),
      tooltip: "Offer sent - awaiting customer response"
    },
    accepted: {
      color: "green",
      icon: CheckCircleSolid,
      label: t("custom.offers.status.accepted"),
      tooltip: "Offer accepted by customer"
    },
    rejected: {
      color: "red",
      icon: XCircle,
      label: t("custom.offers.status.rejected"),
      tooltip: "Offer rejected by customer"
    },
    expired: {
      color: "orange",
      icon: ExclamationCircleSolid,
      label: t("custom.offers.status.expired"),
      tooltip: "Offer expired - validity period has passed"
    },
    converted: {
      color: "purple",
      icon: ArrowPath,
      label: t("custom.offers.status.converted"),
      tooltip: "Offer converted to order"
    }
  }

  const config = statusConfig[status]
  const Icon = config.icon

  const badge = (
    <StatusBadge color={config.color} className="flex items-center gap-1.5">
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </StatusBadge>
  )

  if (!showTooltip) {
    return badge
  }

  return (
    <Tooltip content={config.tooltip}>
      {badge}
    </Tooltip>
  )
}

