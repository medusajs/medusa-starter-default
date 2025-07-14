import * as zod from "zod"
import { useState } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  FocusModal,
  Heading,
  Label,
  Input,
  Button,
  Select,
  Textarea,
  Text,
  Badge,
  toast,
} from "@medusajs/ui"
import { Plus, Trash } from "@medusajs/icons"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

// Schema for a single line item
const itemSchema = zod.object({
  product_variant_id: zod.string().min(1, "Product variant is required"),
  product_title: zod.string().min(1, "Product title is required"),
  quantity_ordered: zod.number().min(1, "Quantity must be at least 1"),
  unit_cost: zod.number().min(0, "Unit cost cannot be negative"),
});

const schema = zod.object({
  supplier_id: zod.string().min(1, "Supplier is required"),
  priority: zod.enum(["low", "normal", "high", "urgent"]).default("normal"),
  notes: zod.string().optional(),
  items: zod.array(itemSchema).min(1, "At least one item is required"),
})

type FormData = zod.infer<typeof schema>

// Hook to fetch suppliers
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

interface CreatePurchaseOrderModalProps {
  onSuccess?: () => void
}

export const CreatePurchaseOrderModal = ({ onSuccess }: CreatePurchaseOrderModalProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { data: suppliersData, isLoading: suppliersLoading } = useSuppliers()
  
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      supplier_id: "",
      priority: "normal",
      notes: "",
      items: [{ product_variant_id: "", product_title: "", quantity_ordered: 1, unit_cost: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  })

  const createPoMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/admin/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to create purchase order")
      }
      return response.json()
    },
    onSuccess: () => {
      toast.success("Purchase Order created successfully!")
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
      form.reset()
      setIsOpen(false)
      onSuccess?.()
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create purchase order")
    },
  })

  const handleSubmit = form.handleSubmit((data) => {
    createPoMutation.mutate(data)
  })

  return (
    <FocusModal open={isOpen} onOpenChange={setIsOpen}>
      <FocusModal.Trigger asChild>
        <Button size="small">
          <Plus className="h-4 w-4" />
          Create Purchase Order
        </Button>
      </FocusModal.Trigger>
      <FocusModal.Content>
        <form
          onSubmit={handleSubmit}
          className="flex h-full flex-col overflow-hidden"
        >
          <FocusModal.Header>
            <div className="flex items-center justify-end gap-x-2">
              <FocusModal.Close asChild>
                <Button size="small" variant="secondary">
                  Cancel
                </Button>
              </FocusModal.Close>
              <Button 
                type="submit" 
                size="small" 
                disabled={createPoMutation.isPending}
                isLoading={createPoMutation.isPending}
              >
                Create Purchase Order
              </Button>
            </div>
          </FocusModal.Header>
          <FocusModal.Body className="overflow-y-auto">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-y-8 px-2 py-16">
              <div>
                <Heading>Create Purchase Order</Heading>
                <Text className="text-ui-fg-subtle" size="small">
                  Create a new purchase order for supplier deliveries
                </Text>
              </div>
              
              {/* Basic Information */}
              <div className="border border-ui-border-base rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Heading level="h3">Basic Information</Heading>
                  <Badge size="2xsmall">Required</Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Controller
                    control={form.control}
                    name="supplier_id"
                    render={({ field, fieldState }) => (
                      <div className="space-y-2">
                        <Label size="small" weight="plus">
                          Supplier *
                        </Label>
                        <Select 
                          value={field.value} 
                          onValueChange={field.onChange}
                        >
                          <Select.Trigger>
                            <Select.Value placeholder="Select a supplier" />
                          </Select.Trigger>
                          <Select.Content>
                            {suppliersLoading ? (
                              <Select.Item value="" disabled>
                                Loading suppliers...
                              </Select.Item>
                            ) : suppliersData?.suppliers?.length > 0 ? (
                              suppliersData.suppliers.map((supplier: any) => (
                                <Select.Item key={supplier.id} value={supplier.id}>
                                  {supplier.name}
                                </Select.Item>
                              ))
                            ) : (
                              <Select.Item value="" disabled>
                                No active suppliers found
                              </Select.Item>
                            )}
                          </Select.Content>
                        </Select>
                        {fieldState.error && (
                          <Text size="xsmall" className="text-red-500">
                            {fieldState.error.message}
                          </Text>
                        )}
                        <Text size="xsmall" className="text-ui-fg-subtle">
                          Select the supplier for this purchase order
                        </Text>
                      </div>
                    )}
                  />
                  
                  <Controller
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <div className="space-y-2">
                        <Label size="small" weight="plus">
                          Priority
                        </Label>
                        <Select value={field.value} onValueChange={field.onChange}>
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
                        <Text size="xsmall" className="text-ui-fg-subtle">
                          Set the priority level for this order
                        </Text>
                      </div>
                    )}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="border border-ui-border-base rounded-lg p-6">
                <Heading level="h3" className="mb-4">Notes</Heading>
                <Controller
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label size="small" weight="plus">
                        Additional Notes
                      </Label>
                      <Textarea
                        {...field}
                        placeholder="Any special instructions or notes for this purchase order..."
                        rows={3}
                      />
                      <Text size="xsmall" className="text-ui-fg-subtle">
                        Optional notes or special instructions
                      </Text>
                    </div>
                  )}
                />
              </div>

              {/* Items */}
              <div className="border border-ui-border-base rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Heading level="h3">Items</Heading>
                    <Badge size="2xsmall">Required</Badge>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={() => append({ product_variant_id: "", product_title: "", quantity_ordered: 1, unit_cost: 0 })}
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="border border-ui-border-base rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <Text size="small" weight="plus">
                          Item {index + 1}
                        </Text>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="transparent"
                            size="small"
                            onClick={() => remove(index)}
                          >
                            <Trash className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Controller
                          control={form.control}
                          name={`items.${index}.product_variant_id`}
                          render={({ field, fieldState }) => (
                            <div className="space-y-2">
                              <Label size="small" weight="plus">
                                Product Variant ID *
                              </Label>
                              <Input
                                {...field}
                                placeholder="pv_..."
                              />
                              {fieldState.error && (
                                <Text size="xsmall" className="text-red-500">
                                  {fieldState.error.message}
                                </Text>
                              )}
                              <Text size="xsmall" className="text-ui-fg-subtle">
                                Enter the product variant ID
                              </Text>
                            </div>
                          )}
                        />
                        
                        <Controller
                          control={form.control}
                          name={`items.${index}.product_title`}
                          render={({ field, fieldState }) => (
                            <div className="space-y-2">
                              <Label size="small" weight="plus">
                                Product Title *
                              </Label>
                              <Input
                                {...field}
                                placeholder="Product name"
                              />
                              {fieldState.error && (
                                <Text size="xsmall" className="text-red-500">
                                  {fieldState.error.message}
                                </Text>
                              )}
                              <Text size="xsmall" className="text-ui-fg-subtle">
                                Enter the product title
                              </Text>
                            </div>
                          )}
                        />
                        
                        <Controller
                          control={form.control}
                          name={`items.${index}.quantity_ordered`}
                          render={({ field, fieldState }) => (
                            <div className="space-y-2">
                              <Label size="small" weight="plus">
                                Quantity *
                              </Label>
                              <Input
                                {...field}
                                type="number"
                                min="1"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                              {fieldState.error && (
                                <Text size="xsmall" className="text-red-500">
                                  {fieldState.error.message}
                                </Text>
                              )}
                              <Text size="xsmall" className="text-ui-fg-subtle">
                                Quantity to order
                              </Text>
                            </div>
                          )}
                        />
                        
                        <Controller
                          control={form.control}
                          name={`items.${index}.unit_cost`}
                          render={({ field, fieldState }) => (
                            <div className="space-y-2">
                              <Label size="small" weight="plus">
                                Unit Cost *
                              </Label>
                              <Input
                                {...field}
                                type="number"
                                min="0"
                                step="0.01"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                              {fieldState.error && (
                                <Text size="xsmall" className="text-red-500">
                                  {fieldState.error.message}
                                </Text>
                              )}
                              <Text size="xsmall" className="text-ui-fg-subtle">
                                Cost per unit
                              </Text>
                            </div>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                {form.formState.errors.items && (
                  <Text size="xsmall" className="text-red-500 mt-2">
                    {form.formState.errors.items.message}
                  </Text>
                )}
              </div>
            </div>
          </FocusModal.Body>
        </form>
      </FocusModal.Content>
    </FocusModal>
  )
}