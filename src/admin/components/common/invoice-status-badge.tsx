import { StatusBadge, Tooltip } from "@medusajs/ui"
import {
  PencilSquare,
  Clock,
  CheckCircleSolid,
  ExclamationCircleSolid,
  XCircle,
  LockClosedSolid
} from "@medusajs/icons"
import { useCustomTranslation } from "../../hooks/use-custom-translation"

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled"

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus
  showTooltip?: boolean
  showLockIcon?: boolean
}

/**
 * Reusable Invoice Status Badge Component
 * Shows status with icon and optional lock icon for terminal states
 * Terminal states (paid/cancelled) cannot transition to other states
 */
export const InvoiceStatusBadge = ({
  status,
  showTooltip = true,
  showLockIcon = true
}: InvoiceStatusBadgeProps) => {
  const { t } = useCustomTranslation()

  // Define terminal states (cannot transition to other states)
  const terminalStates: InvoiceStatus[] = ['paid', 'cancelled']
  const isTerminal = terminalStates.includes(status)

  const statusConfig: Record<InvoiceStatus, {
    color: "grey" | "blue" | "green" | "red"
    icon: React.ComponentType<{ className?: string }>
    label: string
    tooltip: string
  }> = {
    draft: {
      color: "grey",
      icon: PencilSquare,
      label: t("custom.invoices.status.draft"),
      tooltip: "Draft invoice - can be edited and sent"
    },
    sent: {
      color: "blue",
      icon: Clock,
      label: t("custom.invoices.status.sent"),
      tooltip: "Invoice sent - can be marked as paid or cancelled"
    },
    paid: {
      color: "green",
      icon: CheckCircleSolid,
      label: t("custom.invoices.status.paid"),
      tooltip: "Invoice paid - final state, cannot be changed"
    },
    overdue: {
      color: "red",
      icon: ExclamationCircleSolid,
      label: t("custom.invoices.status.overdue"),
      tooltip: "Invoice overdue - can still be marked as paid or cancelled"
    },
    cancelled: {
      color: "grey",
      icon: XCircle,
      label: t("custom.invoices.status.cancelled"),
      tooltip: "Invoice cancelled - final state, cannot be changed"
    }
  }

  const config = statusConfig[status]
  const Icon = config.icon

  const badge = (
    <StatusBadge color={config.color} className="flex items-center gap-1.5">
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
      {isTerminal && showLockIcon && (
        <LockClosedSolid className="w-3 h-3 ml-0.5 opacity-70" title="Terminal state" />
      )}
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
