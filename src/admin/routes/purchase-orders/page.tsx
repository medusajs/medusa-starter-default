import { useState, useEffect } from "react"
import { Container, Heading, Button, Table, Badge } from "@medusajs/ui"
import { PencilSquare, Plus, Eye, DocumentText } from "@medusajs/icons"
import { useNavigate } from "react-router-dom"
import { defineRouteConfig } from "@medusajs/admin-sdk"

interface PurchaseOrder {
  id: string
  po_number: string
  supplier_id: string
  status: string
  order_date: Date
  total_amount: number
  currency_code: string
  created_at: Date
}

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchPurchaseOrders()
  }, [])

  const fetchPurchaseOrders = async () => {
    try {
      const response = await fetch('/admin/purchase-orders')
      const data = await response.json()
      setPurchaseOrders(data.purchase_orders || [])
    } catch (error) {
      console.error('Failed to fetch purchase orders:', error)
    } finally {
      setLoading(false)
    }
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

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount / 100) // Assuming amounts are in cents
  }

  if (loading) {
    return (
      <Container className="flex items-center justify-center min-h-96">
        <div>Loading purchase orders...</div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">Purchase Orders</Heading>
        <Button 
          variant="primary"
          onClick={() => navigate('/admin/purchase-orders/new')}
        >
          <Plus className="mr-2" />
          Create Purchase Order
        </Button>
      </div>
      
      <div className="px-6 py-4">
        {purchaseOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Heading level="h3" className="mb-2">No purchase orders found</Heading>
            <p className="text-gray-500 mb-4">Get started by creating your first purchase order</p>
            <Button 
              variant="primary"
              onClick={() => navigate('/admin/purchase-orders/new')}
            >
              <Plus className="mr-2" />
              Create Purchase Order
            </Button>
          </div>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>PO Number</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Order Date</Table.HeaderCell>
                <Table.HeaderCell>Total</Table.HeaderCell>
                <Table.HeaderCell>Created</Table.HeaderCell>
                <Table.HeaderCell>Actions</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {purchaseOrders.map((po) => (
                <Table.Row key={po.id}>
                  <Table.Cell>
                    <div className="font-medium">{po.po_number}</div>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={getStatusColor(po.status)}>
                      {po.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    {new Date(po.order_date).toLocaleDateString()}
                  </Table.Cell>
                  <Table.Cell>
                    {formatCurrency(po.total_amount, po.currency_code)}
                  </Table.Cell>
                  <Table.Cell>
                    {new Date(po.created_at).toLocaleDateString()}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="transparent"
                        size="small"
                        onClick={() => navigate(`/admin/purchase-orders/${po.id}`)}
                      >
                        <Eye />
                      </Button>
                      <Button
                        variant="transparent"
                        size="small"
                        onClick={() => navigate(`/admin/purchase-orders/${po.id}/edit`)}
                      >
                        <PencilSquare />
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Purchase Orders", 
  icon: DocumentText,
}) 