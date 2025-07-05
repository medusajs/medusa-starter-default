import * as zod from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Drawer,
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
import { useEffect } from "react"

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

interface Machine {
  id: string
  brand: string
  model: string
  serial_number: string
  year: string
  engine_hours?: string
  fuel_type: string
  horsepower?: string
  weight?: string
  purchase_date?: string
  purchase_price?: string
  current_value?: string
  status: "active" | "inactive" | "maintenance"
  location?: string
  notes?: string
  customer_id?: string
  created_at: string
  updated_at: string
}

interface EditMachineFormProps {
  machine: Machine
  trigger?: React.ReactNode
}

export const EditMachineForm = ({ machine, trigger }: EditMachineFormProps) => {
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

  // Update form values when machine data changes
  useEffect(() => {
    if (machine) {
      form.reset({
        brand: machine.brand || "",
        model: machine.model || "",
        serial_number: machine.serial_number || "",
        year: machine.year || "",
        engine_hours: machine.engine_hours || "",
        fuel_type: machine.fuel_type || "diesel",
        horsepower: machine.horsepower || "",
        weight: machine.weight || "",
        purchase_date: machine.purchase_date || "",
        purchase_price: machine.purchase_price || "",
        current_value: machine.current_value || "",
        status: machine.status || "active",
        location: machine.location || "",
        notes: machine.notes || "",
        customer_id: machine.customer_id || "",
      })
    }
  }, [machine, form])

  const updateMachineMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch(`/admin/machines/${machine.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        throw new Error("Failed to update machine")
      }
      
      return response.json()
    },
    onSuccess: () => {
      toast.success("Machine updated successfully!")
      queryClient.invalidateQueries({ queryKey: ["machines"] })
      queryClient.invalidateQueries({ queryKey: ["machine", machine.id] })
    },
    onError: (error) => {
      toast.error("Failed to update machine. Please try again.")
      console.error("Error updating machine:", error)
    },
  })

  const handleSubmit = form.handleSubmit((data) => {
    updateMachineMutation.mutate(data)
  })

  return (
    <Drawer>
      <Drawer.Trigger asChild>
        {trigger || <Button>Edit Machine</Button>}
      </Drawer.Trigger>
      <Drawer.Content>
        <FormProvider {...form}>
          <form
            onSubmit={handleSubmit}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <Drawer.Header>
              <Heading className="capitalize">
                Edit Machine
              </Heading>
            </Drawer.Header>
            <Drawer.Body className="flex max-w-full flex-1 flex-col gap-y-8 overflow-y-auto">
              
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
            </Drawer.Body>
            <Drawer.Footer>
              <div className="flex items-center justify-end gap-x-2">
                <Drawer.Close asChild>
                  <Button size="small" variant="secondary">
                    Cancel
                  </Button>
                </Drawer.Close>
                <Button 
                  size="small" 
                  type="submit"
                  disabled={updateMachineMutation.isPending}
                >
                  {updateMachineMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </Drawer.Footer>
          </form>
        </FormProvider>
      </Drawer.Content>
    </Drawer>
  )
} 