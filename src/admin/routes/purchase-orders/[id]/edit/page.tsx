import React, { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowLeft, CheckCircle, Trash, Plus } from "@medusajs/icons"
import { 
  Heading, 
  Button, 
  Input, 
  Select, 
  Textarea, 
  Text,
  Badge,
  toast,
  Label
} from "@medusajs/ui"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

interface PurchaseOrderFormData {
  supplier_id: string
  priority: "low" | "normal" | "high" | "urgent"
  expected_delivery_date?: string
  payment_terms?: string
  notes?: string
  items: {
    id?: string
    product_variant_id: string
    product_title: string
    quantity_ordered: number
    unit_cost: number
  }[]
}

interface PurchaseOrderItem {
  id: string
  product_variant_id: string
  product_title: string
  product_variant_title?: string
  quantity_ordered: number
  quantity_received: number
  unit_cost: number
  line_total: number
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

const useSuppliers = () => {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const response = await fetch(`/admin/suppliers?limit=100&is_active=true`)
      if (!response.ok) throw new Error("Failed to fetch suppliers")
      return response.json()
    },
  })
}

const useUpdatePurchaseOrder = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PurchaseOrderFormData> }) => {
      const response = await fetch(`/admin/purchase-orders/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          expected_delivery_date: data.expected_delivery_date ? new Date(data.expected_delivery_date) : null,
          payment_terms: data.payment_terms || null,
          notes: data.notes || null,
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to update purchase order")
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-order"] })
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
    }
  })
}

const EditPurchaseOrderPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const updatePurchaseOrderMutation = useUpdatePurchaseOrder()
  const { data: purchaseOrder, isLoading, error } = usePurchaseOrder(id!)
  const { data: suppliersData, isLoading: suppliersLoading } = useSuppliers()
  
  // Form state
  const [formData, setFormData] = useState<PurchaseOrderFormData>({
    supplier_id: "",
    priority: "normal",
    expected_delivery_date: "",
    payment_terms: "",
    notes: "",
    items: [],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load purchase order data into form when available
  useEffect(() => {
    if (purchaseOrder) {
      setFormData({
        supplier_id: purchaseOrder.supplier_id || "",
        priority: purchaseOrder.priority || "normal",
        expected_delivery_date: purchaseOrder.expected_delivery_date 
          ? new Date(purchaseOrder.expected_delivery_date).toISOString().split('T')[0] 
          : "",
        payment_terms: purchaseOrder.payment_terms || "",
        notes: purchaseOrder.notes || "",
        items: purchaseOrder.items?.map((item: PurchaseOrderItem) => ({
          id: item.id,
          product_variant_id: item.product_variant_id,
          product_title: item.product_title,
          quantity_ordered: item.quantity_ordered,
          unit_cost: item.unit_cost / 100, // Convert from cents
        })) || [],
      })
    }
  }, [purchaseOrder])

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.supplier_id) {
      newErrors.supplier_id = "Supplier is required"
    }

    if (formData.items.length === 0) {
      newErrors.items = "At least one item is required"
    }

    formData.items.forEach((item, index) => {
      if (!item.product_variant_id) {
        newErrors[`items.${index}.product_variant_id`] = "Product variant ID is required"
      }
      if (!item.product_title) {
        newErrors[`items.${index}.product_title`] = "Product title is required"
      }
      if (item.quantity_ordered <= 0) {
        newErrors[`items.${index}.quantity_ordered`] = "Quantity must be greater than 0"
      }
      if (item.unit_cost < 0) {
        newErrors[`items.${index}.unit_cost`] = "Unit cost cannot be negative"
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || !id) {
      return
    }

    try {
      await updatePurchaseOrderMutation.mutateAsync({ 
        id, 
        data: {
          ...formData,
          // Convert unit costs back to cents for the API
          items: formData.items.map(item => ({
            ...item,
            unit_cost: Math.round(item.unit_cost * 100)
          }))
        }
      })
      toast.success("Purchase order updated successfully!")
      navigate(`/purchase-orders/${id}`)
    } catch (error) {
      toast.error("Failed to update purchase order. Please try again.")
    }
  }

  // Handle input changes
  const handleInputChange = (field: keyof PurchaseOrderFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  // Handle item changes
  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...formData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    setFormData(prev => ({ ...prev, items: newItems }))
    
    // Clear error when user starts typing
    const errorKey = `items.${index}.${field}`
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: "" }))
    }
  }

  // Add new item
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        product_variant_id: "",
        product_title: "",
        quantity_ordered: 1,
        unit_cost: 0
      }]
    }))
  }

  // Remove item
  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }))
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Text>Loading purchase order details...</Text>
      </div>
    )
  }

  if (error || !purchaseOrder) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Text className="text-ui-fg-error">
          Failed to load purchase order details. Please try again.
        </Text>
      </div>
    )
  }

  if (purchaseOrder.status !== 'draft') {
    return (
      <div className="flex h-full w-full items-center justify-center flex-col gap-4">
        <Text className="text-ui-fg-error">
          This purchase order cannot be edited because it is no longer in draft status.
        </Text>
        <Button asChild>
          <Link to={`/purchase-orders/${id}`}>
            View Purchase Order
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex-1 overflow-hidden">
        <div className="bg-ui-bg-base border border-ui-border-base rounded-lg overflow-hidden h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-base">
            <div className="flex items-center gap-4">
              <Button variant="secondary" size="small" asChild>
                <Link to={`/purchase-orders/${id}`}>
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
              <div>
                <Heading level="h1">Edit Purchase Order</Heading>
                <Text className="text-ui-fg-subtle">
                  {purchaseOrder.po_number}
                </Text>
              </div>
            </div>
            <Badge color="grey">DRAFT</Badge>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleSubmit} className="max-w-4xl">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
                  <Heading level="h3" className="mb-4">
                    Order Information
                  </Heading>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label size="small" weight="plus">
                        Supplier *
                      </Label>
                      <Select
                        value={formData.supplier_id}
                        onValueChange={(value) => handleInputChange("supplier_id", value)}
                      >
                        <Select.Trigger>
                          <Select.Value placeholder="Select a supplier" />
                        </Select.Trigger>
                        <Select.Content>
                          {suppliersLoading ? (
                            <Select.Item value="__loading__" disabled>
                              Loading suppliers...
                            </Select.Item>
                          ) : suppliersData?.suppliers?.length > 0 ? (
                            suppliersData.suppliers.map((supplier: any) => (
                              <Select.Item key={supplier.id} value={supplier.id}>
                                {supplier.name}
                              </Select.Item>
                            ))
                          ) : (
                            <Select.Item value="__no_suppliers__" disabled>
                              No active suppliers found
                            </Select.Item>
                          )}
                        </Select.Content>
                      </Select>
                      {errors.supplier_id && (
                        <Text size="xsmall" className="text-red-500">
                          {errors.supplier_id}
                        </Text>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label size="small" weight="plus">
                        Priority
                      </Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) => handleInputChange("priority", value)}
                      >
                        <Select.Trigger>
                          <Select.Value />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="low">Low</Select.Item>
                          <Select.Item value="normal">Normal</Select.Item>
                          <Select.Item value="high">High</Select.Item>
                          <Select.Item value="urgent">Urgent</Select.Item>
                        </Select.Content>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label size="small" weight="plus">
                        Expected Delivery Date
                      </Label>
                      <Input
                        type="date"
                        value={formData.expected_delivery_date}
                        onChange={(e) => handleInputChange("expected_delivery_date", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label size="small" weight="plus">
                        Payment Terms
                      </Label>
                      <Input
                        placeholder="e.g., Net 30, COD"
                        value={formData.payment_terms}
                        onChange={(e) => handleInputChange("payment_terms", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
                  <Heading level="h3" className="mb-4">
                    Notes
                  </Heading>
                  <div className="space-y-2">
                    <Label size="small" weight="plus">
                      Additional Notes
                    </Label>
                    <Textarea
                      placeholder="Any special instructions or notes..."
                      value={formData.notes}
                      onChange={(e) => handleInputChange("notes", e.target.value)}
                      rows={6}
                    />
                  </div>
                </div>
              </div>

              {/* Items Section */}
              <div className="mt-6 bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <Heading level="h3">Items</Heading>
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={addItem}
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </Button>
                </div>

                {errors.items && (
                  <Text size="xsmall" className="text-red-500 mb-4">
                    {errors.items}
                  </Text>
                )}

                <div className="space-y-4">
                  {formData.items.map((item, index) => (
                    <div key={index} className="border border-ui-border-base rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <Text size="small" weight="plus">
                          Item {index + 1}
                        </Text>
                        {formData.items.length > 1 && (
                          <Button
                            type="button"
                            variant="transparent"
                            size="small"
                            onClick={() => removeItem(index)}
                          >
                            <Trash className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            Product Variant ID *
                          </Label>
                          <Input
                            placeholder="pv_..."
                            value={item.product_variant_id}
                            onChange={(e) => handleItemChange(index, "product_variant_id", e.target.value)}
                          />
                          {errors[`items.${index}.product_variant_id`] && (
                            <Text size="xsmall" className="text-red-500">
                              {errors[`items.${index}.product_variant_id`]}
                            </Text>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            Product Title *
                          </Label>
                          <Input
                            placeholder="Product name"
                            value={item.product_title}
                            onChange={(e) => handleItemChange(index, "product_title", e.target.value)}
                          />
                          {errors[`items.${index}.product_title`] && (
                            <Text size="xsmall" className="text-red-500">
                              {errors[`items.${index}.product_title`]}
                            </Text>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            Quantity *
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity_ordered}
                            onChange={(e) => handleItemChange(index, "quantity_ordered", Number(e.target.value))}
                          />
                          {errors[`items.${index}.quantity_ordered`] && (
                            <Text size="xsmall" className="text-red-500">
                              {errors[`items.${index}.quantity_ordered`]}
                            </Text>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            Unit Cost *
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_cost}
                            onChange={(e) => handleItemChange(index, "unit_cost", Number(e.target.value))}
                          />
                          {errors[`items.${index}.unit_cost`] && (
                            <Text size="xsmall" className="text-red-500">
                              {errors[`items.${index}.unit_cost`]}
                            </Text>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-ui-border-base">
                <Button variant="secondary" type="button" asChild>
                  <Link to={`/purchase-orders/${id}`}>
                    Cancel
                  </Link>
                </Button>
                <Button 
                  variant="primary" 
                  type="submit"
                  disabled={updatePurchaseOrderMutation.isPending}
                  isLoading={updatePurchaseOrderMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Update Purchase Order
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditPurchaseOrderPage

export const config = defineRouteConfig({
  label: "Edit Purchase Order",
})