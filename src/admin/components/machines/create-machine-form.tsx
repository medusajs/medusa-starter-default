import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { z } from "zod"
import {
  Button,
  FocusModal,
  Heading,
  Input,
  Label,
  Select,
  Textarea,
  Text,
  toast,
  Badge,
} from "@medusajs/ui"
import { Plus } from "@medusajs/icons"

// Validation schema
const createMachineSchema = z.object({
  brand_id: z.string().nullable().optional(),
  model_number: z.string().min(1, "Model number is required").max(100, "Model number is too long"),
  serial_number: z.string().min(1, "Serial number is required").max(100, "Serial number is too long"),
  license_plate: z.string().max(50).nullable().optional(),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1).nullable().optional(),
  engine_hours: z.number().min(0).nullable().optional(),
  fuel_type: z.string().nullable().optional(),
  horsepower: z.number().min(0).nullable().optional(),
  weight: z.number().min(0).nullable().optional(),
  purchase_date: z.string().nullable().optional(),
  purchase_price: z.string().nullable().optional(),
  current_value: z.string().nullable().optional(),
  status: z.enum(["active", "inactive", "maintenance", "sold"]).default("active"),
  location: z.string().max(255).nullable().optional(),
  customer_id: z.string().nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

type CreateMachineFormData = z.infer<typeof createMachineSchema>

// Fetch customers for dropdown
const fetchCustomers = async () => {
  const response = await fetch('/admin/customers?limit=100')
  if (!response.ok) {
    throw new Error('Failed to fetch customers')
  }
  const data = await response.json()
  return data.customers || []
}

// Fetch brands for dropdown
const fetchBrands = async () => {
  const response = await fetch('/admin/brands?limit=100')
  if (!response.ok) {
    throw new Error('Failed to fetch brands')
  }
  const data = await response.json()
  return data.brands || []
}

interface CreateMachineFormProps {
  onSuccess?: () => void
}

export const CreateMachineForm = ({ onSuccess }: CreateMachineFormProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()

  // Fetch customers
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['create-machine-customers'],
    queryFn: fetchCustomers,
  })

  // Fetch brands
  const { data: brandsData = [], isLoading: brandsLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: fetchBrands,
  })

  // Ensure brands is always an array
  const brands = Array.isArray(brandsData) ? brandsData : []

  const form = useForm<CreateMachineFormData>({
    resolver: zodResolver(createMachineSchema),
    defaultValues: {
      brand_id: undefined,
      model_number: "",
      serial_number: "",
      license_plate: "",
      year: undefined,
      engine_hours: undefined,
      fuel_type: "",
      horsepower: undefined,
      weight: undefined,
      purchase_date: "",
      purchase_price: "",
      current_value: "",
      status: "active",
      location: "",
      customer_id: undefined,
      description: "",
      notes: "",
    },
  })

  const createMachineMutation = useMutation({
    mutationFn: async (data: CreateMachineFormData) => {
      const response = await fetch("/admin/machines", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          brand_id: data.brand_id || null,
          year: data.year || null,
          engine_hours: data.engine_hours || null,
          horsepower: data.horsepower || null,
          weight: data.weight || null,
          purchase_date: data.purchase_date || null,
          purchase_price: data.purchase_price || null,
          current_value: data.current_value || null,
          location: data.location || null,
          customer_id: data.customer_id || null,
          description: data.description || null,
          notes: data.notes || null,
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || "Failed to create machine")
      }
      
      return response.json()
    },
    onSuccess: () => {
      toast.success("Machine created successfully!")
      queryClient.invalidateQueries({ queryKey: ["machines"] })
      form.reset()
      setIsOpen(false)
      onSuccess?.()
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create machine")
    },
  })

  const handleSubmit = form.handleSubmit((data) => {
    createMachineMutation.mutate(data)
  })

  return (
    <FocusModal open={isOpen} onOpenChange={setIsOpen}>
      <FocusModal.Trigger asChild>
        <Button size="small" variant="secondary">
          <Plus className="h-4 w-4" />
          Create Machine
        </Button>
      </FocusModal.Trigger>
      
      <FocusModal.Content>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <FocusModal.Header>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-ui-bg-component rounded-lg">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <Heading level="h1">Create Machine</Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  Add a new machine to your fleet
                </Text>
              </div>
            </div>
          </FocusModal.Header>
          
          <FocusModal.Body className="flex flex-1 flex-col overflow-hidden">
            <div className="flex flex-1 flex-col overflow-y-auto">
              <div className="grid grid-cols-1 gap-8 p-6">
                
                {/* Basic Information */}
                <div className="border border-ui-border-base rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Heading level="h3">Basic Information</Heading>
                    <Badge size="2xsmall">Required</Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Controller
                      control={form.control}
                      name="brand_id"
                      render={({ field, fieldState }) => (
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            Brand
                          </Label>
                          <Select 
                            value={field.value || undefined} 
                            onValueChange={(value) => field.onChange(value || undefined)}
                            disabled={brandsLoading}
                          >
                            <Select.Trigger>
                              <Select.Value placeholder="Select brand (optional)" />
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
                            <Text size="xsmall" className="text-red-500">
                              {fieldState.error.message}
                            </Text>
                          )}
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="model_number"
                      render={({ field, fieldState }) => (
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            Model Number *
                          </Label>
                          <Input
                            {...field}
                            placeholder="e.g., 320D2"
                          />
                          {fieldState.error && (
                            <Text size="xsmall" className="text-red-500">
                              {fieldState.error.message}
                            </Text>
                          )}
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="serial_number"
                      render={({ field, fieldState }) => (
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            Serial Number *
                          </Label>
                          <Input
                            {...field}
                            placeholder="e.g., CAT0320D2001"
                          />
                          {fieldState.error && (
                            <Text size="xsmall" className="text-red-500">
                              {fieldState.error.message}
                            </Text>
                          )}
                          <Text size="xsmall" className="text-ui-fg-subtle">
                            Must be unique across all machines
                          </Text>
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="license_plate"
                      render={({ field, fieldState }) => (
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            License Plate
                          </Label>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="e.g., ABC-123"
                          />
                          {fieldState.error && (
                            <Text size="xsmall" className="text-red-500">
                              {fieldState.error.message}
                            </Text>
                          )}
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="year"
                      render={({ field, fieldState }) => (
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            Manufacturing Year
                          </Label>
                          <Input
                            type="number"
                            min={1900}
                            max={new Date().getFullYear() + 1}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            placeholder="e.g., 2020"
                          />
                          {fieldState.error && (
                            <Text size="xsmall" className="text-red-500">
                              {fieldState.error.message}
                            </Text>
                          )}
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            Status
                          </Label>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <Select.Trigger>
                              <Select.Value />
                            </Select.Trigger>
                            <Select.Content>
                              <Select.Item value="active">Active</Select.Item>
                              <Select.Item value="inactive">Inactive</Select.Item>
                              <Select.Item value="maintenance">Maintenance</Select.Item>
                              <Select.Item value="sold">Sold</Select.Item>
                            </Select.Content>
                          </Select>
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="fuel_type"
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            Fuel Type
                          </Label>
                          <Select value={field.value || undefined} onValueChange={field.onChange}>
                            <Select.Trigger>
                              <Select.Value />
                            </Select.Trigger>
                            <Select.Content>
                              <Select.Item value="diesel">Diesel</Select.Item>
                              <Select.Item value="gasoline">Gasoline</Select.Item>
                              <Select.Item value="electric">Electric</Select.Item>
                              <Select.Item value="hybrid">Hybrid</Select.Item>
                              <Select.Item value="lpg">LPG</Select.Item>
                            </Select.Content>
                          </Select>
                        </div>
                      )}
                    />
                  </div>
                </div>

                {/* Technical Specifications */}
                <div className="border border-ui-border-base rounded-lg p-6">
                  <Heading level="h3" className="mb-4">Technical Specifications</Heading>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Controller
                      control={form.control}
                      name="engine_hours"
                      render={({ field, fieldState }) => (
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            Engine Hours
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            placeholder="e.g., 1500"
                          />
                          {fieldState.error && (
                            <Text size="xsmall" className="text-red-500">
                              {fieldState.error.message}
                            </Text>
                          )}
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="horsepower"
                      render={({ field, fieldState }) => (
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            Horsepower (HP)
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            placeholder="e.g., 300"
                          />
                          {fieldState.error && (
                            <Text size="xsmall" className="text-red-500">
                              {fieldState.error.message}
                            </Text>
                          )}
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="weight"
                      render={({ field, fieldState }) => (
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            Weight (kg)
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            placeholder="e.g., 15000"
                          />
                          {fieldState.error && (
                            <Text size="xsmall" className="text-red-500">
                              {fieldState.error.message}
                            </Text>
                          )}
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            Current Location
                          </Label>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="e.g., Construction Site A"
                          />
                        </div>
                      )}
                    />
                  </div>
                </div>

                {/* Assignment & Financial */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer Assignment */}
                  <div className="border border-ui-border-base rounded-lg p-6">
                    <Heading level="h3" className="mb-4">Customer Assignment</Heading>
                    
                    <Controller
                      control={form.control}
                      name="customer_id"
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            Assigned Customer
                          </Label>
                          <Select 
                            value={field.value || undefined} 
                            onValueChange={(value) => field.onChange(value || undefined)}
                            disabled={customersLoading}
                          >
                            <Select.Trigger>
                              <Select.Value placeholder="Select customer (optional)" />
                            </Select.Trigger>
                            <Select.Content>
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
                          <Text size="xsmall" className="text-ui-fg-subtle">
                            Leave empty if no customer is assigned
                          </Text>
                        </div>
                      )}
                    />
                  </div>

                  {/* Financial Information */}
                  <div className="border border-ui-border-base rounded-lg p-6">
                    <Heading level="h3" className="mb-4">Financial Information</Heading>
                    
                    <div className="space-y-4">
                      <Controller
                        control={form.control}
                        name="purchase_date"
                        render={({ field }) => (
                          <div className="space-y-2">
                            <Label size="small" weight="plus">
                              Purchase Date
                            </Label>
                            <Input
                              type="date"
                              {...field}
                              value={field.value || ""}
                            />
                          </div>
                        )}
                      />
                      
                      <Controller
                        control={form.control}
                        name="purchase_price"
                        render={({ field }) => (
                          <div className="space-y-2">
                            <Label size="small" weight="plus">
                              Purchase Price (€)
                            </Label>
                            <Input
                              {...field}
                              value={field.value || ""}
                              placeholder="e.g., 150000"
                            />
                          </div>
                        )}
                      />
                      
                      <Controller
                        control={form.control}
                        name="current_value"
                        render={({ field }) => (
                          <div className="space-y-2">
                            <Label size="small" weight="plus">
                              Current Value (€)
                            </Label>
                            <Input
                              {...field}
                              value={field.value || ""}
                              placeholder="e.g., 120000"
                            />
                          </div>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="border border-ui-border-base rounded-lg p-6">
                  <Heading level="h3" className="mb-4">Additional Information</Heading>
                  
                  <div className="space-y-4">
                    <Controller
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            Description
                          </Label>
                          <Textarea
                            {...field}
                            value={field.value || ""}
                            placeholder="Brief description of the machine and its purpose..."
                            rows={3}
                          />
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            Notes
                          </Label>
                          <Textarea
                            {...field}
                            value={field.value || ""}
                            placeholder="Any additional notes, maintenance history, or special considerations..."
                            rows={4}
                          />
                        </div>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
          </FocusModal.Body>
          
          <FocusModal.Footer>
            <div className="flex items-center justify-end gap-2">
              <FocusModal.Close asChild>
                <Button variant="secondary" size="small">
                  Cancel
                </Button>
              </FocusModal.Close>
              <Button 
                type="submit" 
                size="small"
                disabled={createMachineMutation.isPending}
                isLoading={createMachineMutation.isPending}
              >
                Create Machine
              </Button>
            </div>
          </FocusModal.Footer>
        </form>
      </FocusModal.Content>
    </FocusModal>
  )
} 