import {
  Container,
  Heading,
  Text,
  DataTable,
  useDataTable,
  createDataTableColumnHelper,
  Button,
  FocusModal,
  Input,
  Label,
  Textarea,
  toast,
  IconButton
} from "@medusajs/ui"
import { useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { PencilSquare, Trash } from "@medusajs/icons"

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

interface PurchaseOrder {
  id: string
  items: PurchaseOrderItem[]
  currency_code: string
  status: string
}

interface PurchaseOrderItemsProps {
  data: PurchaseOrder
}

const formatCurrency = (amount: number, currency: string) => {
  if (amount === null || amount === undefined) return "N/A"
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD'
  }).format(amount / 100)
}

export const PurchaseOrderItems = ({ data: purchaseOrder }: PurchaseOrderItemsProps) => {
  const queryClient = useQueryClient()
  const [editingItem, setEditingItem] = useState<PurchaseOrderItem | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [formData, setFormData] = useState({
    quantity_ordered: 1,
    unit_cost: 0,
    notes: '',
  })

  const isEditable = purchaseOrder.status === 'draft'

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: any }) => {
      const response = await fetch(`/admin/purchase-orders/${purchaseOrder.id}/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error("Failed to update item")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-order", purchaseOrder.id] })
      setShowEditModal(false)
      setEditingItem(null)
    },
    onError: (error: Error) => {
      toast.error(`Failed to update item: ${error.message}`)
    },
  })

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`/admin/purchase-orders/${purchaseOrder.id}/items/${itemId}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete item")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-order", purchaseOrder.id] })
      toast.success("Item deleted successfully")
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete item: ${error.message}`)
    },
  })

  const handleEdit = (item: PurchaseOrderItem) => {
    setEditingItem(item)
    setFormData({
      quantity_ordered: item.quantity_ordered,
      unit_cost: item.unit_cost,
      notes: item.notes || '',
    })
    setShowEditModal(true)
  }

  const handleDelete = (item: PurchaseOrderItem) => {
    if (confirm(`Are you sure you want to delete "${item.product_title}"?`)) {
      deleteItemMutation.mutate(item.id)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return

    updateItemMutation.mutate({
      itemId: editingItem.id,
      data: formData,
    })
  }

  const columnHelper = createDataTableColumnHelper<PurchaseOrderItem>()

  const columns = useMemo(() => [
    columnHelper.accessor("product_title", {
      header: "Product",
      cell: ({ getValue, row }) => (
        <div className="flex flex-col">
          <Text size="small" weight="plus">{getValue()}</Text>
          {row.original.product_variant_title && (
            <Text size="small" className="text-ui-fg-subtle">
              {row.original.product_variant_title}
            </Text>
          )}
        </div>
      ),
    }),
    columnHelper.accessor("quantity_ordered", {
      header: "Qty Ordered",
      cell: ({ getValue, row }) => {
        const item = row.original

        if (!isEditable) {
          return <Text size="small">{getValue()}</Text>
        }

        return (
          <Input
            type="number"
            size="small"
            min="1"
            value={getValue()}
            onChange={(e) => {
              const newValue = parseInt(e.target.value) || 0
              if (newValue > 0 && newValue !== item.quantity_ordered) {
                updateItemMutation.mutate({
                  itemId: item.id,
                  data: { quantity_ordered: newValue },
                })
              }
            }}
            className="w-20"
          />
        )
      },
    }),
    columnHelper.accessor("quantity_received", {
      header: "Qty Received",
      cell: ({ getValue, row }) => {
        const received = getValue()
        const ordered = row.original.quantity_ordered
        const pending = ordered - received

        return (
          <div className="flex flex-col">
            <Text size="small">{received}</Text>
            {pending > 0 && (
              <Text size="xsmall" className="text-ui-fg-subtle">
                {pending} pending
              </Text>
            )}
          </div>
        )
      },
    }),
    columnHelper.accessor("unit_cost", {
      header: "Unit Cost",
      cell: ({ getValue }) => (
        <Text size="small">
          {formatCurrency(getValue(), purchaseOrder.currency_code)}
        </Text>
      ),
    }),
    columnHelper.accessor("line_total", {
      header: "Total",
      cell: ({ getValue }) => (
        <Text size="small" weight="plus">
          {formatCurrency(getValue(), purchaseOrder.currency_code)}
        </Text>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: ({ row }) => {
        if (!isEditable) {
          return null
        }

        return (
          <div className="flex items-center justify-end gap-2">
            <IconButton
              variant="transparent"
              onClick={() => handleEdit(row.original)}
            >
              <PencilSquare />
            </IconButton>
            <IconButton
              variant="transparent"
              onClick={() => handleDelete(row.original)}
            >
              <Trash />
            </IconButton>
          </div>
        )
      },
    }),
  ], [purchaseOrder.currency_code, isEditable])

  const table = useDataTable({
    data: purchaseOrder.items || [],
    columns,
    rowCount: purchaseOrder.items?.length || 0,
    getRowId: (row) => row.id,
  })

  return (
    <>
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Items ({purchaseOrder.items?.length || 0})</Heading>
        </div>
        <DataTable instance={table}>
          <DataTable.Table />
        </DataTable>
      </Container>

      {/* Edit Modal */}
      <FocusModal open={showEditModal} onOpenChange={setShowEditModal}>
        <FocusModal.Content>
          <FocusModal.Header>
            <div className="flex items-center justify-between">
              <Heading level="h2">Edit Item</Heading>
            </div>
          </FocusModal.Header>
          <FocusModal.Body>
            <div className="flex flex-col items-center p-16">
              <div className="w-full max-w-lg">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {editingItem && (
                    <div className="mb-4 p-4 bg-ui-bg-subtle rounded-lg">
                      <Text weight="plus">{editingItem.product_title}</Text>
                      {editingItem.product_variant_title && (
                        <Text size="small" className="text-ui-fg-subtle">
                          {editingItem.product_variant_title}
                        </Text>
                      )}
                    </div>
                  )}

                  <div>
                    <Label size="small" weight="plus">Quantity Ordered</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.quantity_ordered}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        quantity_ordered: parseInt(e.target.value) || 1
                      }))}
                      required
                    />
                  </div>

                  <div>
                    <Label size="small" weight="plus">
                      Unit Cost ({purchaseOrder.currency_code.toUpperCase()})
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={(formData.unit_cost / 100).toFixed(2)}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        unit_cost: Math.round(parseFloat(e.target.value) * 100)
                      }))}
                      required
                    />
                    <Text size="xsmall" className="text-ui-fg-subtle mt-1">
                      Enter the unit cost in {purchaseOrder.currency_code.toUpperCase()}
                    </Text>
                  </div>

                  <div>
                    <Label size="small" weight="plus">Notes (optional)</Label>
                    <Textarea
                      placeholder="Additional notes about this item"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowEditModal(false)}
                      disabled={updateItemMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateItemMutation.isPending}
                      isLoading={updateItemMutation.isPending}
                    >
                      Save Changes
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </>
  )
}
