import * as zod from "zod"
import { useForm, useFieldArray } from "react-hook-form"
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
} from "@medusajs/ui"
import { FormProvider } from "react-hook-form"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "@medusajs/ui"

// Schema for a single line item
const itemSchema = zod.object({
  product_variant_id: zod.string().min(1, "Product variant is required"),
  quantity_ordered: zod.number().min(1, "Quantity must be at least 1"),
  unit_cost: zod.number().min(0, "Unit cost cannot be negative"),
});

const schema = zod.object({
  supplier_id: zod.string().min(1, "Supplier is required"),
  priority: zod.enum(["low", "normal", "high", "urgent"]).optional(),
  notes: zod.string().optional(),
  items: zod.array(itemSchema).min(1, "At least one item is required"),
})

type FormData = zod.infer<typeof schema>

// Hook to fetch suppliers
const useSuppliers = () => {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const response = await fetch(`/admin/suppliers?limit=100`) // Fetch up to 100 suppliers
      if (!response.ok) throw new Error("Failed to fetch suppliers")
      return response.json()
    },
  })
}

export const CreatePurchaseOrderModal = () => {
  const queryClient = useQueryClient()
  const { data: suppliersData, isLoading: suppliersLoading } = useSuppliers()
  
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      supplier_id: "",
      priority: "normal",
      notes: "",
      items: [{ product_variant_id: "", quantity_ordered: 1, unit_cost: 0 }],
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
      if (!response.ok) throw new Error("Failed to create purchase order")
      return response.json()
    },
    onSuccess: () => {
      toast.success("Purchase Order created successfully!")
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
      form.reset()
    },
    onError: (error) => {
      toast.error("Failed to create purchase order.")
      console.error(error)
    },
  })

  const handleSubmit = form.handleSubmit((data) => {
    createPoMutation.mutate(data)
  })

  return (
    <FocusModal>
      <FocusModal.Trigger asChild>
        <Button>Create Purchase Order</Button>
      </FocusModal.Trigger>
      <FocusModal.Content>
        <FormProvider {...form}>
          <form
            onSubmit={handleSubmit}
            className="flex h-full flex-col overflow-hidden"
          >
            <FocusModal.Header>
              <div className="flex items-center justify-end gap-x-2">
                <FocusModal.Close asChild>
                  <Button size="small" variant="secondary">Cancel</Button>
                </FocusModal.Close>
                <Button type="submit" size="small" disabled={createPoMutation.isPending}>
                  {createPoMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </FocusModal.Header>
            <FocusModal.Body className="overflow-y-auto">
                <div className="mx-auto flex w-full max-w-4xl flex-col gap-y-8 px-2 py-16">
                  <Heading>Create Purchase Order</Heading>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="supplier_id">Supplier *</Label>
                      <Select {...form.register("supplier_id")}>
                        <Select.Trigger>
                          <Select.Value placeholder="Select a supplier" />
                        </Select.Trigger>
                        <Select.Content>
                          {suppliersLoading ? <Select.Item value="">Loading...</Select.Item> :
                            suppliersData?.suppliers?.map((s) => (
                              <Select.Item key={s.id} value={s.id}>{s.name}</Select.Item>
                            ))
                          }
                        </Select.Content>
                      </Select>
                      {form.formState.errors.supplier_id && <Text className="text-red-500">{form.formState.errors.supplier_id.message}</Text>}
                    </div>
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select {...form.register("priority")}>
                        <Select.Trigger>
                          <Select.Value placeholder="Select priority" />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="low">Low</Select.Item>
                          <Select.Item value="normal">Normal</Select.Item>
                          <Select.Item value="high">High</Select.Item>
                          <Select.Item value="urgent">Urgent</Select.Item>
                        </Select.Content>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" {...form.register("notes")} />
                  </div>

                  <div className="mt-4">
                    <Heading level="h2" className="mb-2">Items</Heading>
                    {fields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-4 gap-4 mb-4 p-4 border rounded-md">
                        <div className="col-span-2">
                          <Label>Product Variant ID *</Label>
                           <Input {...form.register(`items.${index}.product_variant_id`)} placeholder="pv_..."/>
                           {form.formState.errors.items?.[index]?.product_variant_id && <Text className="text-red-500 text-sm">{form.formState.errors.items[index].product_variant_id.message}</Text>}
                        </div>
                        <div>
                           <Label>Quantity *</Label>
                           <Input type="number" {...form.register(`items.${index}.quantity_ordered`, { valueAsNumber: true })} />
                           {form.formState.errors.items?.[index]?.quantity_ordered && <Text className="text-red-500 text-sm">{form.formState.errors.items[index].quantity_ordered.message}</Text>}
                        </div>
                        <div>
                           <Label>Unit Cost *</Label>
                           <Input type="number" {...form.register(`items.${index}.unit_cost`, { valueAsNumber: true })} />
                           {form.formState.errors.items?.[index]?.unit_cost && <Text className="text-red-500 text-sm">{form.formState.errors.items[index].unit_cost.message}</Text>}
                        </div>
                        <div className="col-span-4 flex justify-end">
                          <Button variant="danger" size="small" onClick={() => remove(index)}>Remove</Button>
                        </div>
                      </div>
                    ))}
                    <Button 
                      type="button" 
                      variant="secondary"
                      onClick={() => append({ product_variant_id: "", quantity_ordered: 1, unit_cost: 0 })}
                    >
                      Add Item
                    </Button>
                    {form.formState.errors.items && <Text className="text-red-500 mt-2">{form.formState.errors.items.message}</Text>}
                  </div>

                </div>
            </FocusModal.Body>
          </form>
        </FormProvider>
      </FocusModal.Content>
    </FocusModal>
  )
} 