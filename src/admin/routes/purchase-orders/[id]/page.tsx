import { Container, Heading, Text, Button, Badge, DataTable, useDataTable, createDataTableColumnHelper } from "@medusajs/ui"
import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowLeft, PencilSquare, SquaresPlus, DocumentText } from "@medusajs/icons"
import { useState } from "react"

interface PurchaseOrderItem {
  id: string
  product_variant_id: string
  product_title: string
  product_variant_title?: string
  quantity_ordered: number
  quantity_received: number
  unit_cost: number
  line_total: number
  received_date?: Date
  notes?: string
}


const usePurchaseOrder = (id: string) => {
  return useQuery({
    queryKey: ["purchase-order", id],
    queryFn: async () => {
      const response = await fetch(`/admin/purchase-orders/${id}`)
      if (!response.ok) {
        throw new Error("Failed to fetch purchase order")
      }
      const data = await response.json()
      return data.purchase_order
    },
    enabled: !!id,
  })
}

const useSupplier = (supplierId: string) => {
  return useQuery({
    queryKey: ["supplier", supplierId],
    queryFn: async () => {
      const response = await fetch(`/admin/suppliers/${supplierId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch supplier")
      }
      const data = await response.json()
      return data.supplier
    },
    enabled: !!supplierId,
  })
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

const formatCurrency = (amount: number, currency: string) => {
  if (amount === null || amount === undefined) return "N/A"
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount / 100)
}

const PurchaseOrderDetailPage = () => {
  const { id } = useParams()
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })

  const { data: purchaseOrder, isLoading, error } = usePurchaseOrder(id!)
  const { data: supplier } = useSupplier(purchaseOrder?.supplier_id)

  const columnHelper = createDataTableColumnHelper<PurchaseOrderItem>()
  
  const columns = [
    columnHelper.accessor("product_title", {
      header: "Product",
      cell: ({ getValue, row }) => (
        <div>
          <Text className="font-medium">{getValue()}</Text>
          {row.original.product_variant_title && (
            <Text size="small" className="text-ui-fg-subtle">
              {row.original.product_variant_title}
            </Text>
          )}
          <Text size="small" className="text-ui-fg-subtle">
            ID: {row.original.product_variant_id}
          </Text>
        </div>
      ),
    }),
    columnHelper.accessor("quantity_ordered", {
      header: "Qty Ordered",
      cell: ({ getValue }) => <Text>{getValue()}</Text>
    }),
    columnHelper.accessor("quantity_received", {
      header: "Qty Received",
      cell: ({ getValue, row }) => (
        <div>
          <Text>{getValue()}</Text>
          {getValue() < row.original.quantity_ordered && (
            <Text size="small" className="text-orange-500">
              ({row.original.quantity_ordered - getValue()} pending)
            </Text>
          )}
        </div>
      )
    }),
    columnHelper.accessor("unit_cost", {
      header: "Unit Cost",
      cell: ({ getValue }) => (
        <Text>{formatCurrency(getValue(), purchaseOrder?.currency_code || 'USD')}</Text>
      )
    }),
    columnHelper.accessor("line_total", {
      header: "Total",
      cell: ({ getValue }) => (
        <Text className="font-medium">{formatCurrency(getValue(), purchaseOrder?.currency_code || 'USD')}</Text>
      )
    }),
  ]

  const table = useDataTable({
    data: purchaseOrder?.items || [],
    columns,
    rowCount: purchaseOrder?.items?.length || 0,
    getRowId: (row) => row.id,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
  })

  if (isLoading) {
    return (
      <Container>
        <Text>Loading...</Text>
      </Container>
    )
  }

  if (error) {
    return (
      <Container>
        <Text>Error loading purchase order: {error.message}</Text>
      </Container>
    )
  }

  if (!purchaseOrder) {
    return (
      <Container>
        <Text>Purchase order not found</Text>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="secondary" size="small" asChild>
            <Link to="/purchase-orders">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <Heading level="h1">{purchaseOrder.po_number}</Heading>
            <Text className="text-ui-fg-subtle">
              {supplier?.name || `Supplier ID: ${purchaseOrder.supplier_id}`}
            </Text>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge color={getStatusColor(purchaseOrder.status) as any}>
            {purchaseOrder.status.replace('_', ' ').toUpperCase()}
          </Badge>
          <Badge color={getPriorityColor(purchaseOrder.priority) as any}>
            {purchaseOrder.priority.toUpperCase()}
          </Badge>
          {purchaseOrder.status === 'draft' && (
            <Button size="small" asChild>
              <Link to={`/purchase-orders/${purchaseOrder.id}/edit`}>
                <PencilSquare className="w-4 h-4" />
                Edit
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Purchase Order Details */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Basic Information */}
          <div className="border border-ui-border-base rounded-lg p-4">
            <Heading level="h3" className="mb-3 flex items-center gap-2">
              <DocumentText className="w-4 h-4" />
              Order Details
            </Heading>
            <div className="space-y-2">
              <div>
                <Text size="small" className="text-ui-fg-subtle">Order Date</Text>
                <Text>{new Date(purchaseOrder.order_date).toLocaleDateString()}</Text>
              </div>
              {purchaseOrder.expected_delivery_date && (
                <div>
                  <Text size="small" className="text-ui-fg-subtle">Expected Delivery</Text>
                  <Text>{new Date(purchaseOrder.expected_delivery_date).toLocaleDateString()}</Text>
                </div>
              )}
              {purchaseOrder.actual_delivery_date && (
                <div>
                  <Text size="small" className="text-ui-fg-subtle">Actual Delivery</Text>
                  <Text>{new Date(purchaseOrder.actual_delivery_date).toLocaleDateString()}</Text>
                </div>
              )}
              {purchaseOrder.payment_terms && (
                <div>
                  <Text size="small" className="text-ui-fg-subtle">Payment Terms</Text>
                  <Text>{purchaseOrder.payment_terms}</Text>
                </div>
              )}
            </div>
          </div>

          {/* Supplier Information */}
          <div className="border border-ui-border-base rounded-lg p-4">
            <Heading level="h3" className="mb-3">Supplier</Heading>
            <div className="space-y-2">
              <div>
                <Text size="small" className="text-ui-fg-subtle">Name</Text>
                <Text className="font-medium">{supplier?.name || 'Loading...'}</Text>
              </div>
              {supplier?.contact_person && (
                <div>
                  <Text size="small" className="text-ui-fg-subtle">Contact Person</Text>
                  <Text>{supplier.contact_person}</Text>
                </div>
              )}
              {supplier?.email && (
                <div>
                  <Text size="small" className="text-ui-fg-subtle">Email</Text>
                  <Text>{supplier.email}</Text>
                </div>
              )}
              {supplier?.phone && (
                <div>
                  <Text size="small" className="text-ui-fg-subtle">Phone</Text>
                  <Text>{supplier.phone}</Text>
                </div>
              )}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="border border-ui-border-base rounded-lg p-4">
            <Heading level="h3" className="mb-3">Financial Summary</Heading>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Text size="small" className="text-ui-fg-subtle">Subtotal</Text>
                <Text>{formatCurrency(purchaseOrder.subtotal, purchaseOrder.currency_code)}</Text>
              </div>
              {purchaseOrder.tax_amount > 0 && (
                <div className="flex justify-between">
                  <Text size="small" className="text-ui-fg-subtle">Tax</Text>
                  <Text>{formatCurrency(purchaseOrder.tax_amount, purchaseOrder.currency_code)}</Text>
                </div>
              )}
              {purchaseOrder.shipping_amount > 0 && (
                <div className="flex justify-between">
                  <Text size="small" className="text-ui-fg-subtle">Shipping</Text>
                  <Text>{formatCurrency(purchaseOrder.shipping_amount, purchaseOrder.currency_code)}</Text>
                </div>
              )}
              {purchaseOrder.discount_amount > 0 && (
                <div className="flex justify-between">
                  <Text size="small" className="text-ui-fg-subtle">Discount</Text>
                  <Text className="text-green-600">-{formatCurrency(purchaseOrder.discount_amount, purchaseOrder.currency_code)}</Text>
                </div>
              )}
              <div className="flex justify-between border-t border-ui-border-base pt-2">
                <Text className="font-medium">Total</Text>
                <Text className="font-medium">{formatCurrency(purchaseOrder.total_amount, purchaseOrder.currency_code)}</Text>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {purchaseOrder.notes && (
        <div className="px-6 py-4">
          <div className="border border-ui-border-base rounded-lg p-4">
            <Heading level="h3" className="mb-3">Notes</Heading>
            <Text>{purchaseOrder.notes}</Text>
          </div>
        </div>
      )}

      {/* Items Table */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <Heading level="h3" className="flex items-center gap-2">
            <SquaresPlus className="w-4 h-4" />
            Items ({purchaseOrder.items?.length || 0})
          </Heading>
        </div>
        
        <DataTable instance={table}>
          <DataTable.Table />
          <DataTable.Pagination />
        </DataTable>
      </div>

      {/* Actions */}
      <div className="px-6 py-4">
        <div className="flex gap-2">
          <Button variant="secondary" asChild>
            <Link to="/purchase-orders">Back to Purchase Orders</Link>
          </Button>
          {purchaseOrder.status === 'draft' && (
            <Button asChild>
              <Link to={`/purchase-orders/${purchaseOrder.id}/edit`}>
                Edit Purchase Order
              </Link>
            </Button>
          )}
          <Button variant="secondary" asChild>
            <Link to={`/suppliers/${purchaseOrder.supplier_id}`}>
              View Supplier
            </Link>
          </Button>
        </div>
      </div>
    </Container>
  )
}

export default PurchaseOrderDetailPage

export const config = defineRouteConfig({
  label: "Purchase Order Details",
})