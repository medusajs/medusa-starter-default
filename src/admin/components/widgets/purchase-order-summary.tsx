import { Container, Heading, Badge, Button, Text, StatusBadge, DropdownMenu, toast } from "@medusajs/ui"
import { Link } from "react-router-dom"
import { PencilSquare, ArrowLeft, EllipsisHorizontal, ArrowUpTray, DocumentText } from "@medusajs/icons"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

interface PurchaseOrder {
  id: string
  po_number: string
  status: string
  priority: string
  type: string
  order_date: string
  expected_delivery_date?: string
  actual_delivery_date?: string
  supplier_id: string
}

interface PurchaseOrderSummaryProps {
  data: PurchaseOrder
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

export const PurchaseOrderSummary = ({ data: purchaseOrder }: PurchaseOrderSummaryProps) => {
  const queryClient = useQueryClient()
  const [isExporting, setIsExporting] = useState(false)

  const sendPOMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/admin/purchase-orders/${purchaseOrder.id}/send`, {
        method: "POST",
      })
      if (!response.ok) throw new Error("Failed to send purchase order")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-order", purchaseOrder.id] })
      toast.success("Purchase order sent successfully")
    },
    onError: (error: Error) => {
      toast.error(`Failed to send purchase order: ${error.message}`)
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

  const isDraft = purchaseOrder.status === 'draft'
  const isSent = purchaseOrder.status === 'sent'

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="secondary" size="small" asChild>
            <Link to="/purchase-orders">
              <ArrowLeft />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <Heading level="h1">{purchaseOrder.po_number}</Heading>
            <StatusBadge color={getStatusColor(purchaseOrder.status) as any}>
              {purchaseOrder.status.replace('_', ' ')}
            </StatusBadge>
            <Badge color={getPriorityColor(purchaseOrder.priority) as any}>
              {purchaseOrder.priority.toUpperCase()}
            </Badge>
            {purchaseOrder.type && (
              <Badge color={getTypeColor(purchaseOrder.type) as any}>
                {purchaseOrder.type.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDraft && (
            <>
              <Button size="small" asChild variant="secondary">
                <Link to={`/purchase-orders/${purchaseOrder.id}/edit`}>
                  <PencilSquare />
                  Edit
                </Link>
              </Button>
              <Button
                size="small"
                onClick={() => sendPOMutation.mutate()}
                isLoading={sendPOMutation.isPending}
              >
                <ArrowUpTray />
                Send to Supplier
              </Button>
            </>
          )}
          {!isDraft && (
            <DropdownMenu>
              <DropdownMenu.Trigger asChild>
                <Button variant="secondary" size="small" isLoading={isExporting}>
                  <DocumentText />
                  Export
                  <EllipsisHorizontal />
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
        </div>
      </div>
    </Container>
  )
}
