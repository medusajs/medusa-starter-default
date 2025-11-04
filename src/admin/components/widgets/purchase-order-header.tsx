import { StatusBadge, Button, DropdownMenu, toast, usePrompt } from "@medusajs/ui"
import { Link } from "react-router-dom"
import {
  PencilSquare,
  ArrowUpTray,
  DocumentText,
  Plus,
  CheckCircleSolid,
  EllipsisHorizontal,
  XCircle
} from "@medusajs/icons"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Container } from "../common/container"
import { Header } from "../common/header"

interface PurchaseOrder {
  id: string
  po_number: string
  status: string
  priority: string
  type: string
}

interface PurchaseOrderHeaderProps {
  data: PurchaseOrder
  onImportDelivery?: () => void
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'draft': return 'grey'
    case 'sent': return 'blue'
    case 'confirmed': return 'orange'
    case 'partially_received': return 'purple'
    case 'received': return 'green'
    case 'cancelled': return 'red'
    default: return 'grey'
  }
}

export const PurchaseOrderHeader = ({ data: purchaseOrder, onImportDelivery }: PurchaseOrderHeaderProps) => {
  const queryClient = useQueryClient()
  const confirmDialog = usePrompt()
  const [isExporting, setIsExporting] = useState(false)

  const sendOrderMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/admin/purchase-orders/${purchaseOrder.id}/send`, {
        method: "POST",
      })
      if (!response.ok) throw new Error("Failed to send order")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-order", purchaseOrder.id] })
      toast.success("Purchase order sent successfully")
    },
    onError: (error: Error) => {
      toast.error(`Failed to send order: ${error.message}`)
    },
  })

  const confirmOrderMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/admin/purchase-orders/${purchaseOrder.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!response.ok) throw new Error("Failed to confirm order")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-order", purchaseOrder.id] })
      toast.success("Purchase order confirmed")
    },
    onError: (error: Error) => {
      toast.error(`Failed to confirm order: ${error.message}`)
    },
  })

  const handleExportCSV = async () => {
    setIsExporting(true)
    try {
      const response = await fetch(`/admin/purchase-orders/${purchaseOrder.id}/export?format=csv`)
      if (!response.ok) throw new Error("Failed to export purchase order")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `po-${purchaseOrder.po_number}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Purchase order exported successfully")
    } catch (error) {
      toast.error(`Failed to export: ${error}`)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportJSON = async () => {
    setIsExporting(true)
    try {
      const response = await fetch(`/admin/purchase-orders/${purchaseOrder.id}/export?format=json`)
      if (!response.ok) throw new Error("Failed to export purchase order")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `po-${purchaseOrder.po_number}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Purchase order exported successfully")
    } catch (error) {
      toast.error(`Failed to export: ${error}`)
    } finally {
      setIsExporting(false)
    }
  }

  const handleSendOrder = async () => {
    const confirmed = await confirmDialog({
      title: "Send Purchase Order",
      description: `Are you sure you want to send PO ${purchaseOrder.po_number} to the supplier? The order status will be changed to "Sent".`,
    })

    if (confirmed) {
      sendOrderMutation.mutate()
    }
  }

  const handleConfirmOrder = async () => {
    const confirmed = await confirmDialog({
      title: "Confirm Purchase Order",
      description: `Confirm that the supplier has acknowledged PO ${purchaseOrder.po_number}? This indicates the supplier has accepted the order.`,
    })

    if (confirmed) {
      confirmOrderMutation.mutate()
    }
  }

  const isDraft = purchaseOrder.status === 'draft'
  const isSent = purchaseOrder.status === 'sent'
  const isReceivable = ["confirmed", "partially_received", "received"].includes(purchaseOrder.status)

  const actions = []

  // Draft-specific actions
  if (isDraft) {
    actions.push({
      type: "button" as const,
      props: {
        onClick: handleSendOrder,
        isLoading: sendOrderMutation.isPending,
        children: (
          <>
            <ArrowUpTray />
            Send to Supplier
          </>
        ),
      },
    })
  }

  // Sent-specific actions
  if (isSent) {
    actions.push({
      type: "button" as const,
      props: {
        onClick: handleConfirmOrder,
        isLoading: confirmOrderMutation.isPending,
        children: (
          <>
            <CheckCircleSolid />
            Confirm Order
          </>
        ),
      },
    })
  }

  // Receivable actions
  if (isReceivable && onImportDelivery) {
    actions.push({
      type: "button" as const,
      props: {
        onClick: onImportDelivery,
        children: (
          <>
            <Plus />
            Import Delivery
          </>
        ),
      },
    })
  }

  // Export dropdown for non-draft orders
  if (!isDraft) {
    actions.push({
      type: "custom" as const,
      children: (
        <DropdownMenu>
          <DropdownMenu.Trigger asChild>
            <Button variant="secondary" size="small" isLoading={isExporting}>
              <DocumentText />
              Export
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            <DropdownMenu.Item onClick={handleExportCSV}>
              <DocumentText className="mr-2" />
              Export as CSV
            </DropdownMenu.Item>
            <DropdownMenu.Item onClick={handleExportJSON}>
              <DocumentText className="mr-2" />
              Export as JSON
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
      ),
    })
  }

  // More actions menu
  actions.push({
    type: "custom" as const,
    children: (
      <DropdownMenu>
        <DropdownMenu.Trigger asChild>
          <Button variant="secondary" size="small">
            <EllipsisHorizontal />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end">
          {isDraft && (
            <>
              <DropdownMenu.Item asChild>
                <Link to={`/purchase-orders/${purchaseOrder.id}/edit`}>
                  <PencilSquare className="text-ui-fg-subtle" />
                  Edit
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item onClick={handleExportCSV}>
                <ArrowUpTray className="text-ui-fg-subtle" />
                Export CSV
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
            </>
          )}
          <DropdownMenu.Item className="text-ui-fg-destructive">
            <XCircle />
            Cancel Order
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
    ),
  })

  const subtitle = (
    <StatusBadge color={getStatusColor(purchaseOrder.status) as any}>
      {purchaseOrder.status.replace('_', ' ')}
    </StatusBadge>
  )

  return (
    <Container>
      <Header title={purchaseOrder.po_number} subtitle={subtitle as any} actions={actions} />
    </Container>
  )
}
