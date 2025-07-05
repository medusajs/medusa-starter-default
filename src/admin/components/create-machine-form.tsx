import * as zod from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  FocusModal,
  Heading,
  Label,
  Input,
  Button,
  Select,
  Textarea,
} from "@medusajs/ui"
import {
  FormProvider,
  Controller,
} from "react-hook-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "@medusajs/ui"

const schema = zod.object({
  brand: zod.string().min(1, "Brand is required"),
  model: zod.string().min(1, "Model is required"),
  serial_number: zod.string().min(1, "Serial number is required"),
  year: zod.string().min(1, "Year is required"),
  engine_hours: zod.string().optional(),
  fuel_type: zod.string().min(1, "Fuel type is required"),
  horsepower: zod.string().optional(),
  weight: zod.string().optional(),
  purchase_date: zod.string().optional(),
  purchase_price: zod.string().optional(),
  current_value: zod.string().optional(),
  status: zod.enum(["active", "inactive", "maintenance"]),
  location: zod.string().optional(),
  notes: zod.string().optional(),
  customer_id: zod.string().optional(),
})

type FormData = zod.infer<typeof schema>

export const CreateMachineForm = () => {
  const queryClient = useQueryClient()
  
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      brand: "",
      model: "",
      serial_number: "",
      year: "",
      engine_hours: "",
      fuel_type: "diesel",
      horsepower: "",
      weight: "",
      purchase_date: "",
      purchase_price: "",
      current_value: "",
      status: "active",
      location: "",
      notes: "",
      customer_id: "",
    },
  })

  const createMachineMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/admin/machines", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        throw new Error("Failed to create machine")
      }
      
      return response.json()
    },
    onSuccess: () => {
      toast.success("Machine created successfully!")
      queryClient.invalidateQueries({ queryKey: ["machines"] })
      form.reset()
    },
    onError: (error) => {
      toast.error("Failed to create machine. Please try again.")
      console.error("Error creating machine:", error)
    },
  })

  const handleSubmit = form.handleSubmit((data) => {
    createMachineMutation.mutate(data)
  })

  return (
    <FocusModal>
      <FocusModal.Trigger asChild>
        <Button>Create Machine</Button>
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
                  <Button size="small" variant="secondary">
                    Cancel
                  </Button>
                </FocusModal.Close>
                <Button 
                  type="submit" 
                  size="small"
                  disabled={createMachineMutation.isPending}
                >
                  {createMachineMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </FocusModal.Header>
            <FocusModal.Body>
              <div className="flex flex-1 flex-col items-center overflow-y-auto">
                <div className="mx-auto flex w-full max-w-[720px] flex-col gap-y-8 px-2 py-16">
                  <div>
                    <Heading className="capitalize">
                      Create Machine
                    </Heading>
                  </div>
                  
                  {/* Basic Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <Controller
                      control={form.control}
                      name="brand"
                      render={({ field, fieldState }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Brand *
                          </Label>
                          <Input {...field} />
                          {fieldState.error && (
                            <span className="text-red-500 text-sm">
                              {fieldState.error.message}
                            </span>
                          )}
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="model"
                      render={({ field, fieldState }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Model *
                          </Label>
                          <Input {...field} />
                          {fieldState.error && (
                            <span className="text-red-500 text-sm">
                              {fieldState.error.message}
                            </span>
                          )}
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="serial_number"
                      render={({ field, fieldState }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Serial Number *
                          </Label>
                          <Input {...field} />
                          {fieldState.error && (
                            <span className="text-red-500 text-sm">
                              {fieldState.error.message}
                            </span>
                          )}
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="year"
                      render={({ field, fieldState }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Year *
                          </Label>
                          <Input {...field} />
                          {fieldState.error && (
                            <span className="text-red-500 text-sm">
                              {fieldState.error.message}
                            </span>
                          )}
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="fuel_type"
                      render={({ field, fieldState }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Fuel Type *
                          </Label>
                          <Select {...field}>
                            <Select.Trigger>
                              <Select.Value placeholder="Select fuel type" />
                            </Select.Trigger>
                            <Select.Content>
                              <Select.Item value="diesel">Diesel</Select.Item>
                              <Select.Item value="gasoline">Gasoline</Select.Item>
                              <Select.Item value="electric">Electric</Select.Item>
                              <Select.Item value="hybrid">Hybrid</Select.Item>
                            </Select.Content>
                          </Select>
                          {fieldState.error && (
                            <span className="text-red-500 text-sm">
                              {fieldState.error.message}
                            </span>
                          )}
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="status"
                      render={({ field, fieldState }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Status *
                          </Label>
                          <Select {...field}>
                            <Select.Trigger>
                              <Select.Value placeholder="Select status" />
                            </Select.Trigger>
                            <Select.Content>
                              <Select.Item value="active">Active</Select.Item>
                              <Select.Item value="inactive">Inactive</Select.Item>
                              <Select.Item value="maintenance">Maintenance</Select.Item>
                            </Select.Content>
                          </Select>
                          {fieldState.error && (
                            <span className="text-red-500 text-sm">
                              {fieldState.error.message}
                            </span>
                          )}
                        </div>
                      )}
                    />
                  </div>
                  
                  {/* Technical Specifications */}
                  <div className="grid grid-cols-2 gap-4">
                    <Controller
                      control={form.control}
                      name="engine_hours"
                      render={({ field }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Engine Hours
                          </Label>
                          <Input {...field} />
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="horsepower"
                      render={({ field }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Horsepower
                          </Label>
                          <Input {...field} />
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="weight"
                      render={({ field }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Weight
                          </Label>
                          <Input {...field} />
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Location
                          </Label>
                          <Input {...field} />
                        </div>
                      )}
                    />
                  </div>
                  
                  {/* Financial Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <Controller
                      control={form.control}
                      name="purchase_date"
                      render={({ field }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Purchase Date
                          </Label>
                          <Input {...field} type="date" />
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="purchase_price"
                      render={({ field }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Purchase Price
                          </Label>
                          <Input {...field} />
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="current_value"
                      render={({ field }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Current Value
                          </Label>
                          <Input {...field} />
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="customer_id"
                      render={({ field }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Customer ID
                          </Label>
                          <Input {...field} />
                        </div>
                      )}
                    />
                  </div>
                  
                  {/* Notes */}
                  <div className="grid grid-cols-1 gap-4">
                    <Controller
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <div className="flex flex-col space-y-2">
                          <Label size="small" weight="plus">
                            Notes
                          </Label>
                          <Textarea {...field} />
                        </div>
                      )}
                    />
                  </div>
                </div>
              </div>
            </FocusModal.Body>
          </form>
        </FormProvider>
      </FocusModal.Content>
    </FocusModal>
  )
} 