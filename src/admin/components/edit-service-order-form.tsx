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
  DatePicker,
} from "@medusajs/ui"
import {
  FormProvider,
  Controller,
} from "react-hook-form"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { toast } from "@medusajs/ui"
import { useEffect, useState } from "react"

const schema = zod.object({
  description: zod.string().min(1, "Description is required"),
  service_type: zod.enum(["normal", "warranty", "setup", "emergency", "preventive"]),
  priority: zod.enum(["low", "normal", "high", "urgent"]),
  status: zod.enum(["draft", "scheduled", "in_progress", "waiting_parts", "customer_approval", "completed", "cancelled"]),
  service_location: zod.enum(["workshop", "customer_location"]),
  customer_id: zod.string().nullable().optional(),
  machine_id: zod.string().nullable().optional(),
  technician_id: zod.string().nullable().optional(),
  customer_complaint: zod.string().nullable().optional(),
  scheduled_start_date: zod.string().nullable().optional(),
  scheduled_end_date: zod.string().nullable().optional(),
  estimated_hours: zod.number().min(0, "Estimated hours must be positive").nullable().optional(),
  labor_rate: zod.number().min(0, "Labor rate must be positive").nullable().optional(),
  diagnosis: zod.string().nullable().optional(),
  notes: zod.string().nullable().optional(),
  service_address_line_1: zod.string().nullable().optional(),
  service_address_line_2: zod.string().nullable().optional(),
  service_city: zod.string().nullable().optional(),
  service_postal_code: zod.string().nullable().optional(),
  service_country: zod.string().nullable().optional(),
})

type FormData = zod.infer<typeof schema>

interface ServiceOrder {
  id: string
  service_order_number: string
  description: string
  service_type: string
  priority: string
  status: string
  service_location: string
  customer_id?: string | null
  machine_id?: string | null
  technician_id?: string | null
  customer_complaint?: string | null
  scheduled_start_date?: string | null
  scheduled_end_date?: string | null
  estimated_hours?: number | null
  labor_rate?: number | null
  diagnosis?: string | null
  notes?: string | null
  service_address_line_1?: string | null
  service_address_line_2?: string | null
  service_city?: string | null
  service_postal_code?: string | null
  service_country?: string | null
  created_at: string
  updated_at: string
}

interface EditServiceOrderFormProps {
  serviceOrder: ServiceOrder
  trigger?: React.ReactNode
}

export const EditServiceOrderForm = ({ serviceOrder, trigger }: EditServiceOrderFormProps) => {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  
  // Fetch customers for the dropdown
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ["edit-service-order-customers"],
    queryFn: async () => {
      const response = await fetch("/admin/customers?limit=100")
      if (!response.ok) {
        throw new Error("Failed to fetch customers")
      }
      const data = await response.json()
      return data.customers || []
    },
  })
  
  // Fetch technicians for the dropdown
  const { data: technicians = [], isLoading: techniciansLoading } = useQuery({
    queryKey: ["edit-service-order-technicians"],
    queryFn: async () => {
      const response = await fetch("/admin/technicians?limit=100&status=active")
      if (!response.ok) {
        throw new Error("Failed to fetch technicians")
      }
      const data = await response.json()
      return data.technicians || []
    },
  })
  
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: "",
      service_type: "normal",
      priority: "normal",
      status: "draft",
      service_location: "workshop",
      customer_id: "",
      machine_id: "",
      technician_id: "",
      customer_complaint: "",
      scheduled_start_date: "",
      scheduled_end_date: "",
      estimated_hours: undefined,
      labor_rate: 85,
      diagnosis: "",
      notes: "",
      service_address_line_1: "",
      service_address_line_2: "",
      service_city: "",
      service_postal_code: "",
      service_country: "",
    },
  })

  // Watch customer_id for machines query
  const selectedCustomerId = form.watch('customer_id')

  // Fetch machines for the dropdown
  const { data: machines = [], isLoading: machinesLoading } = useQuery({
    queryKey: ["machines", selectedCustomerId],
    queryFn: async () => {
      // If customer is selected, fetch only their machines
      const params = new URLSearchParams({
        limit: '100',
        status: 'active',
      })
      if (selectedCustomerId) {
        params.append('customer_id', selectedCustomerId)
      }
      const response = await fetch(`/admin/machines?${params}`)
      if (!response.ok) {
        throw new Error("Failed to fetch machines")
      }
      const data = await response.json()
      return data.machines || []
    },
    enabled: !!selectedCustomerId, // Only fetch when customer is selected
  })

  // Update form values when serviceOrder changes
  useEffect(() => {
    if (serviceOrder) {
      form.reset({
        description: serviceOrder.description || "",
        service_type: serviceOrder.service_type as any,
        priority: serviceOrder.priority as any,
        status: serviceOrder.status as any,
        service_location: serviceOrder.service_location as any,
        customer_id: serviceOrder.customer_id || "",
        machine_id: serviceOrder.machine_id || "",
        technician_id: serviceOrder.technician_id || "",
        customer_complaint: serviceOrder.customer_complaint || "",
        scheduled_start_date: serviceOrder.scheduled_start_date ? new Date(serviceOrder.scheduled_start_date).toISOString().split('T')[0] : "",
        scheduled_end_date: serviceOrder.scheduled_end_date ? new Date(serviceOrder.scheduled_end_date).toISOString().split('T')[0] : "",
        estimated_hours: serviceOrder.estimated_hours || undefined,
        labor_rate: serviceOrder.labor_rate || 85,
        diagnosis: serviceOrder.diagnosis || "",
        notes: serviceOrder.notes || "",
        service_address_line_1: serviceOrder.service_address_line_1 || "",
        service_address_line_2: serviceOrder.service_address_line_2 || "",
        service_city: serviceOrder.service_city || "",
        service_postal_code: serviceOrder.service_postal_code || "",
        service_country: serviceOrder.service_country || "",
      })
    }
  }, [serviceOrder, form])

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      console.log("Sending update data:", data)
      
      const response = await fetch(`/admin/service-orders/${serviceOrder.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          scheduled_start_date: data.scheduled_start_date ? new Date(data.scheduled_start_date).toISOString() : null,
          scheduled_end_date: data.scheduled_end_date ? new Date(data.scheduled_end_date).toISOString() : null,
          technician_id: data.technician_id === "unassigned" ? null : data.technician_id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("API error:", errorData)
        throw new Error(errorData.details || "Failed to update service order")
      }

      const result = await response.json()
      console.log("Update result:", result)
      return result
    },
    onSuccess: (data) => {
      console.log("Update successful:", data)
      toast.success("Service order updated successfully!")
      
      // Invalidate all service order related queries
      queryClient.invalidateQueries({ queryKey: ["service-orders"] })
      queryClient.invalidateQueries({ queryKey: ["service-order", serviceOrder.id] })
      
      // Also invalidate any queries that might contain service order data
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === "service-orders" || 
          (Array.isArray(query.queryKey) && query.queryKey.includes("service-order"))
      })
      
      // Refetch the service orders list to ensure immediate update
      queryClient.refetchQueries({ queryKey: ["service-orders"] })
      
      setIsOpen(false)
    },
    onError: (error: Error) => {
      console.error("Update error:", error)
      toast.error(`Failed to update service order: ${error.message}`)
    },
  })

  const handleSubmit = (data: FormData) => {
    updateMutation.mutate(data)
  }

  // Filter machines by selected customer
  const customerMachines = machines

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <Drawer.Trigger asChild>
        {trigger || <Button variant="secondary">Edit Service Order</Button>}
      </Drawer.Trigger>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>Edit Service Order</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="overflow-y-auto">
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <Heading level="h3">Basic Information</Heading>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="service_type">Service Type</Label>
                    <Controller
                      name="service_type"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <Select.Trigger>
                            <Select.Value />
                          </Select.Trigger>
                          <Select.Content>
                            <Select.Item value="normal">Normal</Select.Item>
                            <Select.Item value="warranty">Warranty</Select.Item>
                            <Select.Item value="setup">Setup</Select.Item>
                            <Select.Item value="emergency">Emergency</Select.Item>
                            <Select.Item value="preventive">Preventive</Select.Item>
                          </Select.Content>
                        </Select>
                      )}
                    />
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Controller
                      name="priority"
                      control={form.control}
                      render={({ field }) => (
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
                      )}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="service_location">Service Location</Label>
                    <Controller
                      name="service_location"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <Select.Trigger>
                            <Select.Value />
                          </Select.Trigger>
                          <Select.Content>
                            <Select.Item value="workshop">Workshop</Select.Item>
                            <Select.Item value="customer_location">Customer Location</Select.Item>
                          </Select.Content>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Controller
                    name="status"
                    control={form.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <Select.Trigger>
                          <Select.Value />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="draft">Draft</Select.Item>
                          <Select.Item value="scheduled">Scheduled</Select.Item>
                          <Select.Item value="in_progress">In Progress</Select.Item>
                          <Select.Item value="waiting_parts">Waiting Parts</Select.Item>
                          <Select.Item value="customer_approval">Customer Approval</Select.Item>
                          <Select.Item value="completed">Completed</Select.Item>
                          <Select.Item value="cancelled">Cancelled</Select.Item>
                        </Select.Content>
                      </Select>
                    )}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Controller
                    name="description"
                    control={form.control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        placeholder="Describe the service required..."
                        rows={3}
                      />
                    )}
                  />
                  {form.formState.errors.description && (
                    <p className="text-ui-fg-error text-sm mt-1">
                      {form.formState.errors.description.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="customer_complaint">Customer Complaint</Label>
                  <Controller
                    name="customer_complaint"
                    control={form.control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        placeholder="What did the customer report?"
                        rows={2}
                      />
                    )}
                  />
                </div>
              </div>

              {/* Assignment */}
              <div className="space-y-4">
                <Heading level="h3">Assignment</Heading>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customer_id">Customer</Label>
                    <Controller
                      name="customer_id"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <Select.Trigger>
                            <Select.Value placeholder="Select customer" />
                          </Select.Trigger>
                          <Select.Content>
                            {customers.map((customer: any) => (
                              <Select.Item key={customer.id} value={customer.id}>
                                {customer.first_name && customer.last_name 
                                  ? `${customer.first_name} ${customer.last_name}`
                                  : customer.email}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select>
                      )}
                    />
                  </div>

                  <div>
                    <Label htmlFor="machine_id">Machine</Label>
                    <Controller
                      name="machine_id"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <Select.Trigger>
                            <Select.Value placeholder="Select machine" />
                          </Select.Trigger>
                          <Select.Content>
                            {customerMachines.map((machine: any) => (
                              <Select.Item key={machine.id} value={machine.id}>
                                {machine.brand_name || 'Unknown Brand'} - {machine.model_number}
                                {machine.serial_number && ` (${machine.serial_number})`}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="technician_id">Assigned Technician</Label>
                  <Controller
                    name="technician_id"
                    control={form.control}
                    render={({ field }) => (
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <Select.Trigger>
                          <Select.Value placeholder="Select technician" />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="unassigned">No technician assigned</Select.Item>
                          {technicians.map((technician: any) => (
                            <Select.Item key={technician.id} value={technician.id}>
                              {technician.first_name} {technician.last_name}
                              {technician.position && ` - ${technician.position}`}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select>
                    )}
                  />
                </div>
              </div>

              {/* Scheduling */}
              <div className="space-y-4">
                <Heading level="h3">Scheduling</Heading>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="scheduled_start_date">Scheduled Start Date</Label>
                    <Controller
                      name="scheduled_start_date"
                      control={form.control}
                      render={({ field }) => (
                        <Input
                          type="date"
                          {...field}
                          value={field.value || ""}
                        />
                      )}
                    />
                  </div>

                  <div>
                    <Label htmlFor="scheduled_end_date">Scheduled End Date</Label>
                    <Controller
                      name="scheduled_end_date"
                      control={form.control}
                      render={({ field }) => (
                        <Input
                          type="date"
                          {...field}
                          value={field.value || ""}
                        />
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="estimated_hours">Estimated Hours</Label>
                    <Controller
                      name="estimated_hours"
                      control={form.control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      )}
                    />
                  </div>

                  <div>
                    <Label htmlFor="labor_rate">Labor Rate (€/hour)</Label>
                    <Controller
                      name="labor_rate"
                      control={form.control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
              
              {/* Service Address - only show if service location is customer_location */}
              {form.watch('service_location') === 'customer_location' && (
                <div className="space-y-4">
                  <Heading level="h3">Service Address</Heading>
                  <div className="text-sm text-ui-fg-subtle mb-4">
                    Address where the service will be performed
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="service_address_line_1">Address Line 1</Label>
                      <Controller
                        name="service_address_line_1"
                        control={form.control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="Street address"
                          />
                        )}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="service_address_line_2">Address Line 2</Label>
                      <Controller
                        name="service_address_line_2"
                        control={form.control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="Apartment, suite, etc."
                          />
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="service_city">City</Label>
                      <Controller
                        name="service_city"
                        control={form.control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="City"
                          />
                        )}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="service_postal_code">Postal Code</Label>
                      <Controller
                        name="service_postal_code"
                        control={form.control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="Postal code"
                          />
                        )}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="service_country">Country</Label>
                      <Controller
                        name="service_country"
                        control={form.control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="Country"
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Technical Details */}
              <div className="space-y-4">
                <Heading level="h3">Technical Details</Heading>
                
                <div>
                  <Label htmlFor="diagnosis">Diagnosis</Label>
                  <Controller
                    name="diagnosis"
                    control={form.control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        placeholder="Technical diagnosis and findings..."
                        rows={3}
                      />
                    )}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Internal Notes</Label>
                  <Controller
                    name="notes"
                    control={form.control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        placeholder="Internal notes and comments..."
                        rows={3}
                      />
                    )}
                  />
                </div>
              </div>
            </form>
          </FormProvider>
        </Drawer.Body>
        <Drawer.Footer>
          <div className="flex justify-end gap-2">
            <Button 
              variant="secondary"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={form.handleSubmit(handleSubmit)}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Updating..." : "Update Service Order"}
            </Button>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}