import { 
  Container, 
  Heading, 
  Text, 
  Badge, 
  Button, 
  Table,
  Input,
  Textarea,
  FocusModal,
  toast
} from "@medusajs/ui"
import { Tools, Plus, Trash } from "@medusajs/icons"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface ServiceOrderItem {
  id: string
  title: string
  description?: string
  sku?: string
  quantity_needed: number
  unit_price: number
  total_price: number
  status: string
  notes?: string
}

interface ServiceOrder {
  id: string
  service_order_number: string
}

interface ServiceOrderItemsWidgetProps {
  data: ServiceOrder
}

const ServiceOrderItemsWidget = ({ data: serviceOrder }: ServiceOrderItemsWidgetProps) => {
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sku: '',
    quantity_needed: 1,
    unit_price: 0,
    notes: '',
  })

  const { data: items, isLoading } = useQuery({
    queryKey: ["service-order-items", serviceOrder?.id],
    queryFn: async () => {
      const response = await fetch(`/admin/service-orders/${serviceOrder.id}/items`)
      if (!response.ok) throw new Error("Failed to fetch items")
      return response.json()
    },
    enabled: !!serviceOrder?.id,
  })

  const addItemMutation = useMutation({
    mutationFn: async (itemData: any) => {
      const response = await fetch(`/admin/service-orders/${serviceOrder.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemData),
      })
      if (!response.ok) throw new Error("Failed to add item")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-order-items", serviceOrder.id] })
      queryClient.invalidateQueries({ queryKey: ["service-order", serviceOrder.id] })
      // Also invalidate comments to show the event
      queryClient.invalidateQueries({ queryKey: ["service-order-comments", serviceOrder.id] })
      setShowAddModal(false)
      setFormData({
        title: '',
        description: '',
        sku: '',
        quantity_needed: 1,
        unit_price: 0,
        notes: '',
      })
      toast.success("Item added successfully")
    },
    onError: (error) => {
      toast.error(`Failed to add item: ${error.message}`)
    }
  })

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`/admin/service-orders/${serviceOrder.id}/items/${itemId}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to remove item")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-order-items", serviceOrder.id] })
      queryClient.invalidateQueries({ queryKey: ["service-order", serviceOrder.id] })
      // Also invalidate comments to show the event
      queryClient.invalidateQueries({ queryKey: ["service-order-comments", serviceOrder.id] })
      toast.success("Item removed successfully")
    },
    onError: (error) => {
      toast.error(`Failed to remove item: ${error.message}`)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addItemMutation.mutate(formData)
  }

  const handleDeleteItem = (itemId: string, itemTitle: string) => {
    if (confirm(`Are you sure you want to remove "${itemTitle}" from this service order?`)) {
      deleteItemMutation.mutate(itemId)
    }
  }

  if (!serviceOrder) {
    return null
  }

  const serviceOrderItems = items?.items || []

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Parts & Items</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {serviceOrderItems.length} item{serviceOrderItems.length !== 1 ? 's' : ''} added
          </Text>
        </div>
        <Button size="small" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Text>Loading items...</Text>
          </div>
        ) : serviceOrderItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Tools className="w-12 h-12 text-ui-fg-muted mb-4" />
            <Text className="text-ui-fg-muted mb-2">No items added yet</Text>
            <Text size="small" className="text-ui-fg-subtle">
              Add parts and items needed for this service order
            </Text>
          </div>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Item</Table.HeaderCell>
                <Table.HeaderCell>SKU</Table.HeaderCell>
                <Table.HeaderCell>Quantity</Table.HeaderCell>
                <Table.HeaderCell>Unit Price</Table.HeaderCell>
                <Table.HeaderCell>Total</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Actions</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {serviceOrderItems.map((item: ServiceOrderItem) => (
                <Table.Row key={item.id}>
                  <Table.Cell>
                    <div>
                      <Text weight="plus" size="small">{item.title}</Text>
                      {item.description && (
                        <Text size="small" className="text-ui-fg-subtle">
                          {item.description}
                        </Text>
                      )}
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="small">{item.sku || '-'}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="small">{item.quantity_needed}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="small">${item.unit_price?.toFixed(2)}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="small">${item.total_price?.toFixed(2)}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge size="2xsmall" color={
                      item.status === 'pending' ? 'orange' :
                      item.status === 'ordered' ? 'blue' :
                      item.status === 'received' ? 'green' :
                      item.status === 'used' ? 'purple' : 'grey'
                    }>
                      {item.status}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Button
                      variant="transparent"
                      size="small"
                      onClick={() => handleDeleteItem(item.id, item.title)}
                      disabled={deleteItemMutation.isPending}
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>

      <FocusModal open={showAddModal} onOpenChange={setShowAddModal}>
        <FocusModal.Content>
          <FocusModal.Header>
            <div className="flex items-center justify-end">
              <FocusModal.Close asChild>
                <Button variant="secondary">Cancel</Button>
              </FocusModal.Close>
            </div>
          </FocusModal.Header>
          <FocusModal.Body>
            <div className="flex flex-col items-center p-16">
              <div className="w-full max-w-lg">
                <div className="mb-8 text-center">
                  <Heading level="h2" className="mb-2">Add Item</Heading>
                  <Text className="text-ui-fg-subtle">
                    Add a new part or item to this service order
                  </Text>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Input
                      placeholder="Item title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <Textarea
                      placeholder="Description (optional)"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      placeholder="SKU (optional)"
                      value={formData.sku}
                      onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                    />
                    <Input
                      type="number"
                      placeholder="Quantity needed"
                      value={formData.quantity_needed}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity_needed: parseInt(e.target.value) }))}
                      required
                    />
                  </div>

                  <div>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Unit price"
                      value={formData.unit_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit_price: parseFloat(e.target.value) }))}
                      required
                    />
                  </div>

                  <div>
                    <Textarea
                      placeholder="Notes (optional)"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowAddModal(false)}
                      disabled={addItemMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={addItemMutation.isPending}
                    >
                      {addItemMutation.isPending ? "Adding..." : "Add Item"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </Container>
  )
}

export default ServiceOrderItemsWidget