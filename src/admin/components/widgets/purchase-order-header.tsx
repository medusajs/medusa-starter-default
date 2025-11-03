import { Container, Heading, Badge, StatusBadge, Button, DropdownMenu, toast, usePrompt } from "@medusajs/ui"
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

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'red'
    case 'high': return 'orange'
    case 'normal': return 'blue'
    case 'low': return 'grey'
    default: return 'blue'
  }
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'rush': return 'red'
    case 'stock': return 'blue'
    default: return 'blue'
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

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left: Title and Badges */}
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Heading level="h1">{purchaseOrder.po_number}</Heading>
              <StatusBadge color={getStatusColor(purchaseOrder.status) as any}>
                {purchaseOrder.status.replace('_', ' ')}
              </StatusBadge>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge color={getPriorityColor(purchaseOrder.priority) as any} size="small">
                {purchaseOrder.priority.toUpperCase()}
              </Badge>
              {purchaseOrder.type && (
                <Badge color={getTypeColor(purchaseOrder.type) as any} size="small">
                  {purchaseOrder.type.toUpperCase()}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="small" asChild>
            <Link to="/purchase-orders">Back to List</Link>
          </Button>

          {/* Draft Actions */}
          {isDraft && (
            <>
              <Button size="small" variant="secondary" asChild>
                <Link to={`/purchase-orders/${purchaseOrder.id}/edit`}>
                  <PencilSquare />
                  Edit
                </Link>
              </Button>
              <Button
                size="small"
                onClick={handleSendOrder}
                isLoading={sendOrderMutation.isPending}
              >
                <ArrowUpTray />
                Send to Supplier
              </Button>
            </>
          )}

          {/* Sent Actions */}
          {isSent && (
            <Button
              size="small"
              onClick={handleConfirmOrder}
              isLoading={confirmOrderMutation.isPending}
            >
              <CheckCircleSolid />
              Confirm Order
            </Button>
          )}

          {/* Receivable Actions */}
          {isReceivable && onImportDelivery && (
            <Button size="small" onClick={onImportDelivery}>
              <Plus />
              Import Delivery
            </Button>
          )}

          {/* Export Menu */}
          {!isDraft && (
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
          )}

          {/* More Actions */}
          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <Button variant="secondary" size="small">
                <EllipsisHorizontal />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end">
              {isDraft && (
                <>
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
        </div>
      </div>
    </Container>
  )
}
