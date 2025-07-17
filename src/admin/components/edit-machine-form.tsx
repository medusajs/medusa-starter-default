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
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { toast } from "@medusajs/ui"
import { useEffect } from "react"

const schema = zod.object({
  brand_name: zod.string().nullable().optional(),
  model_number: zod.string().min(1, "Model number is required"),
  serial_number: zod.string().min(1, "Serial number is required"),
  license_plate: zod.string().nullable().optional(),
  year: zod.number().min(1800, "Year must be valid").max(new Date().getFullYear() + 1, "Year cannot be in the future").nullable().optional(),
  engine_hours: zod.number().min(0, "Engine hours must be positive").nullable().optional(),
  fuel_type: zod.string().nullable().optional(),
  horsepower: zod.number().min(0, "Horsepower must be positive").nullable().optional(),
  weight: zod.number().min(0, "Weight must be positive").nullable().optional(),
  purchase_date: zod.string().nullable().optional(),
  purchase_price: zod.number().min(0, "Purchase price must be positive").nullable().optional(),
  current_value: zod.number().min(0, "Current value must be positive").nullable().optional(),
  status: zod.enum(["active", "inactive", "maintenance", "sold"]),
  location: zod.string().nullable().optional(),
  description: zod.string().nullable().optional(),
  notes: zod.string().nullable().optional(),
  customer_id: zod.string().nullable().optional(),
})

type FormData = zod.infer<typeof schema>

interface Brand {
  id: string
  name: string
  code: string
  is_active: boolean
}

interface Machine {
  id: string
  brand_name?: string | null
  model_number: string
  serial_number: string
  license_plate?: string | null
  year?: number | null
  engine_hours?: number | null
  fuel_type?: string | null
  horsepower?: number | null
  weight?: number | null
  purchase_date?: string | null
  purchase_price?: number | null
  current_value?: number | null
  status: "active" | "inactive" | "maintenance" | "sold"
  location?: string | null
  description?: string | null
  notes?: string | null
  customer_id?: string | null
  created_at: string
  updated_at: string
}

interface EditMachineFormProps {
  machine: Machine
  trigger?: React.ReactNode
}

export const EditMachineForm = ({ machine, trigger }: EditMachineFormProps) => {
  const queryClient = useQueryClient()
  
  // Fetch brands for the dropdown
  const { data: brands = [], isLoading: brandsLoading } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const response = await fetch("/admin/brands?limit=100")
      if (!response.ok) {
        throw new Error("Failed to fetch brands")
      }
      const data = await response.json()
      return data.brands || []
    },
  })
  
  // Fetch customers for the dropdown
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const response = await fetch("/admin/customers?limit=100")
      if (!response.ok) {
        throw new Error("Failed to fetch customers")
      }
      const data = await response.json()
      return data.customers || []
    },
  })
  
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      brand_name: "",
      model_number: "",
      serial_number: "",
      license_plate: "",
      year: undefined,
      engine_hours: undefined,
      fuel_type: "",
      horsepower: undefined,
      weight: undefined,
      purchase_date: "",
      purchase_price: undefined,
      current_value: undefined,
      status: "active",
      location: "",
      description: "",
      notes: "",
      customer_id: "",
    },
  })

  // Update form values when machine data changes
  useEffect(() => {
    if (machine) {
      form.reset({
        brand_name: machine.brand_name || "",
        model_number: machine.model_number || "",
        serial_number: machine.serial_number || "",
        license_plate: machine.license_plate || "",
        year: machine.year || undefined,
        engine_hours: machine.engine_hours || undefined,
        fuel_type: machine.fuel_type || "",
        horsepower: machine.horsepower || undefined,
        weight: machine.weight || undefined,
        purchase_date: machine.purchase_date || "",
        purchase_price: machine.purchase_price || undefined,
        current_value: machine.current_value || undefined,
        status: machine.status || "active",
        location: machine.location || "",
        description: machine.description || "",
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
                  name="brand_name"
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col space-y-2">
                      <Label size="small" weight="plus">
                        Brand *
                      </Label>
                      <Select value={field.value || undefined} onValueChange={field.onChange} disabled={brandsLoading}>
                        <Select.Trigger>
                          <Select.Value placeholder="Select brand" />
                        </Select.Trigger>
                        <Select.Content>
                          {brands.map((brand: any) => (
                            <Select.Item key={brand.id} value={brand.id}>
                              {brand.name}
                            </Select.Item>
                          ))}
                          {brands.length === 0 && !brandsLoading && (
                            <div className="px-2 py-1 text-sm text-ui-fg-subtle">
                              No brands available
                            </div>
                          )}
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
                  name="model_number"
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col space-y-2">
                      <Label size="small" weight="plus">
                        Model Number *
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
                  name="license_plate"
                  render={({ field }) => (
                    <div className="flex flex-col space-y-2">
                      <Label size="small" weight="plus">
                        License Plate
                      </Label>
                      <Input {...field} />
                    </div>
                  )}
                />
                
                <Controller
                  control={form.control}
                  name="year"
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col space-y-2">
                      <Label size="small" weight="plus">
                        Year
                      </Label>
                      <Input 
                        {...field} 
                        type="number" 
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
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
                        Fuel Type
                      </Label>
                      <Select value={field.value} onValueChange={field.onChange}>
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
                      <Select value={field.value} onValueChange={field.onChange}>
                        <Select.Trigger>
                          <Select.Value placeholder="Select status" />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="active">Active</Select.Item>
                          <Select.Item value="inactive">Inactive</Select.Item>
                          <Select.Item value="maintenance">Maintenance</Select.Item>
                          <Select.Item value="sold">Sold</Select.Item>
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
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col space-y-2">
                      <Label size="small" weight="plus">
                        Engine Hours
                      </Label>
                      <Input 
                        {...field} 
                        type="number" 
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
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
                  name="horsepower"
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col space-y-2">
                      <Label size="small" weight="plus">
                        Horsepower
                      </Label>
                      <Input 
                        {...field} 
                        type="number" 
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
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
                  name="weight"
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col space-y-2">
                      <Label size="small" weight="plus">
                        Weight (kg)
                      </Label>
                      <Input 
                        {...field} 
                        type="number" 
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
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
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col space-y-2">
                      <Label size="small" weight="plus">
                        Purchase Price
                      </Label>
                      <Input 
                        {...field} 
                        type="number" 
                        step="0.01"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
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
                  name="current_value"
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col space-y-2">
                      <Label size="small" weight="plus">
                        Current Value
                      </Label>
                      <Input 
                        {...field} 
                        type="number" 
                        step="0.01"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
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
                  name="customer_id"
                  render={({ field }) => (
                    <div className="flex flex-col space-y-2">
                      <Label size="small" weight="plus">
                        Customer
                      </Label>
                      <Select value={field.value || "none"} onValueChange={(value) => field.onChange(value === "none" ? "" : value)} disabled={customersLoading}>
                        <Select.Trigger>
                          <Select.Value placeholder="Select customer (optional)" />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="none">No customer assigned</Select.Item>
                          {customers.map((customer: any) => (
                            <Select.Item key={customer.id} value={customer.id}>
                              {customer.first_name} {customer.last_name}
                              {customer.email && ` (${customer.email})`}
                            </Select.Item>
                          ))}
                          {customers.length === 0 && !customersLoading && (
                            <div className="px-2 py-1 text-sm text-ui-fg-subtle">
                              No customers available
                            </div>
                          )}
                        </Select.Content>
                      </Select>
                    </div>
                  )}
                />
              </div>
              
              {/* Description and Notes */}
              <div className="grid grid-cols-1 gap-4">
                <Controller
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <div className="flex flex-col space-y-2">
                      <Label size="small" weight="plus">
                        Description
                      </Label>
                      <Textarea {...field} />
                    </div>
                  )}
                />
                
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