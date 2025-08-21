import { Container, Heading, Text, Badge, Skeleton, Button, Input, Select, Textarea, Label, StatusBadge } from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PencilSquare } from "@medusajs/icons"
import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { ServiceTypeLabel } from "../components/common/service-type-label"

interface ServiceOrder {
  id: string
  service_order_number: string
  description: string
  customer_complaint?: string
  service_type: string
  priority: string
  status: string
  customer_id?: string
  machine_id?: string
  technician_id?: string
  total_labor_cost?: number
  total_parts_cost?: number
  total_cost?: number
  estimated_hours?: number
  actual_hours?: number
  has_appointment: boolean
  needs_replacement_vehicle: boolean
  includes_minor_maintenance: boolean
  includes_major_maintenance: boolean
  is_repeated_repair: boolean
  includes_cleaning: boolean
  est_used: boolean
  ca_used: boolean
  internal_notes?: string
  customer_notes?: string
  created_at: string
  updated_at: string
}

interface ServiceOrderOverviewWidgetProps {
  data: ServiceOrder
}

const ServiceOrderOverviewWidget = ({ data: serviceOrder }: ServiceOrderOverviewWidgetProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const queryClient = useQueryClient()

  // Fetch customer data
  const { data: customer, isLoading: customerLoading } = useQuery({
    queryKey: ['customer', serviceOrder?.customer_id],
    queryFn: async () => {
      if (!serviceOrder?.customer_id) return null
      const response = await fetch(`/admin/customers/${serviceOrder.customer_id}`)
      if (!response.ok) throw new Error('Failed to fetch customer')
      const data = await response.json()
      return data.customer
    },
    enabled: !!serviceOrder?.customer_id,
  })

  // Fetch machine data
  const { data: machine, isLoading: machineLoading } = useQuery({
    queryKey: ['machine', serviceOrder?.machine_id],
    queryFn: async () => {
      if (!serviceOrder?.machine_id) return null
      const response = await fetch(`/admin/machines/${serviceOrder.machine_id}`)
      if (!response.ok) throw new Error('Failed to fetch machine')
      const data = await response.json()
      return data.machine
    },
    enabled: !!serviceOrder?.machine_id,
  })

  // Fetch customers for dropdown
  const { data: customers } = useQuery({
    queryKey: ['service-order-overview-customers'],
    queryFn: async () => {
      const response = await fetch('/admin/customers')
      if (!response.ok) throw new Error('Failed to fetch customers')
      const data = await response.json()
      return data.customers
    },
    enabled: isEditing,
  })

  // Fetch machines for dropdown
  const { data: machines } = useQuery({
    queryKey: ['service-order-overview-machines'],
    queryFn: async () => {
      const response = await fetch('/admin/machines')
      if (!response.ok) throw new Error('Failed to fetch machines')
      const data = await response.json()
      return data.machines
    },
    enabled: isEditing,
  })

  // Fetch technicians for dropdown
  const { data: technicians } = useQuery({
    queryKey: ['service-order-overview-technicians'],
    queryFn: async () => {
      const response = await fetch('/admin/technicians')
      if (!response.ok) throw new Error('Failed to fetch technicians')
      const data = await response.json()
      return data.technicians
    },
    enabled: isEditing,
  })

  // Fetch technician data
  const { data: technician, isLoading: technicianLoading } = useQuery({
    queryKey: ['technician', serviceOrder?.technician_id],
    queryFn: async () => {
      if (!serviceOrder?.technician_id) return null
      const response = await fetch(`/admin/technicians/${serviceOrder.technician_id}`)
      if (!response.ok) throw new Error('Failed to fetch technician')
      const data = await response.json()
      return data.technician
    },
    enabled: !!serviceOrder?.technician_id,
  })

  const form = useForm({
    defaultValues: {
      customer_id: serviceOrder?.customer_id || '',
      machine_id: serviceOrder?.machine_id || '',
      technician_id: serviceOrder?.technician_id || 'unassigned',
      description: serviceOrder?.description || '',
      service_type: serviceOrder?.service_type || '',
      priority: serviceOrder?.priority || '',
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/admin/service-orders/${serviceOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update service order')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-order', serviceOrder.id] })
      setIsEditing(false)
    },
  })

  const handleSubmit = form.handleSubmit((data) => {
    // Convert "unassigned" to null for technician_id
    const processedData = {
      ...data,
      technician_id: data.technician_id === "unassigned" ? null : data.technician_id
    }
    updateMutation.mutate(processedData)
  })

  const handleCancel = () => {
    form.reset()
    setIsEditing(false)
  }

  if (!serviceOrder) {
    return null
  }

  const priorityVariants = {
    low: "grey",
    normal: "blue", 
    high: "orange",
    urgent: "red",
  } as const

  const statusVariants = {
    draft: "orange",
    ready_for_pickup: "blue",
    in_progress: "purple", 
    done: "green",
    returned_for_review: "red",
  } as const


  const serviceTypes = [
    'insurance',
    'warranty',
    'internal', 
    'standard',
    'sales_prep',
    'quote'
  ]

  const priorities = [
    'low',
    'normal',
    'high', 
    'urgent'
  ]

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Heading level="h2">{serviceOrder.service_order_number}</Heading>
          <StatusBadge color={statusVariants[serviceOrder.status as keyof typeof statusVariants]}>
            {serviceOrder.status.replace('_', ' ')}
          </StatusBadge>
          <ServiceTypeLabel serviceType={serviceOrder.service_type} />
        </div>
        {!isEditing && (
          <Button 
            size="small" 
            variant="transparent"
            onClick={() => setIsEditing(true)}
          >
            <PencilSquare className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      {isEditing ? (
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="flex flex-col gap-y-4">
            {/* Customer Field */}
            <div className="flex flex-col space-y-2">
              <Label htmlFor="customer" size="small" weight="plus">Customer</Label>
              <Controller
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <Select {...field} onValueChange={field.onChange}>
                    <Select.Trigger>
                      <Select.Value placeholder="Select customer" />
                    </Select.Trigger>
                    <Select.Content>
                      {customers?.map((cust: any) => (
                        <Select.Item key={cust.id} value={cust.id}>
                          {cust.first_name && cust.last_name 
                            ? `${cust.first_name} ${cust.last_name}` 
                            : cust.email}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                )}
              />
            </div>

            {/* Machine Field */}
            <div className="flex flex-col space-y-2">
              <Label htmlFor="machine" size="small" weight="plus">Machine/Equipment</Label>
              <Controller
                control={form.control}
                name="machine_id"
                render={({ field }) => (
                  <Select {...field} onValueChange={field.onChange}>
                    <Select.Trigger>
                      <Select.Value placeholder="Select machine" />
                    </Select.Trigger>
                    <Select.Content>
                      {machines?.map((mach: any) => (
                        <Select.Item key={mach.id} value={mach.id}>
                          {mach.brand_name || 'Unknown Brand'} - {mach.model_number}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                )}
              />
            </div>

            {/* Description Field */}
            <div className="flex flex-col space-y-2">
              <Label htmlFor="description" size="small" weight="plus">Description</Label>
              <Controller
                control={form.control}
                name="description"
                render={({ field }) => (
                  <Textarea {...field} rows={3} />
                )}
              />
            </div>

            {/* Service Type Field */}
            <div className="flex flex-col space-y-2">
              <Label htmlFor="service_type" size="small" weight="plus">Service Type</Label>
              <Controller
                control={form.control}
                name="service_type"
                render={({ field }) => (
                  <Select {...field} onValueChange={field.onChange}>
                    <Select.Trigger>
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      {serviceTypes.map((type) => (
                        <Select.Item key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                )}
              />
            </div>

            {/* Priority Field */}
            <div className="flex flex-col space-y-2">
              <Label htmlFor="priority" size="small" weight="plus">Priority</Label>
              <Controller
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <Select {...field} onValueChange={field.onChange}>
                    <Select.Trigger>
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      {priorities.map((priority) => (
                        <Select.Item key={priority} value={priority}>
                          {priority.charAt(0).toUpperCase() + priority.slice(1)}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                )}
              />
            </div>

            {/* Technician Field */}
            <div className="flex flex-col space-y-2">
              <Label htmlFor="technician" size="small" weight="plus">Assigned Technician</Label>
              <Controller
                control={form.control}
                name="technician_id"
                render={({ field }) => (
                  <Select {...field} onValueChange={field.onChange}>
                    <Select.Trigger>
                      <Select.Value placeholder="Select technician" />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="unassigned">No technician assigned</Select.Item>
                      {technicians?.map((tech: any) => (
                        <Select.Item key={tech.id} value={tech.id}>
                          {tech.first_name && tech.last_name 
                            ? `${tech.first_name} ${tech.last_name}` 
                            : tech.email}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                )}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-x-2 pt-4">
              <Button 
                size="small" 
                variant="secondary" 
                type="button"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button 
                size="small" 
                type="submit"
                isLoading={updateMutation.isPending}
              >
                Save
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <>
          {/* Description Section - Most Important */}
          <div className="px-6 py-4">
            <div className="min-w-0">
              <Label size="small" weight="plus" className="mb-2">
                Description
              </Label>
              <Text size="small">{serviceOrder.description}</Text>
            </div>
          </div>

          {/* Key Relationships Section */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 gap-4">
              {/* Customer */}
              <div className="min-w-0">
                <Label size="small" weight="plus" className="mb-2">
                  Customer
                </Label>
                {customerLoading ? (
                  <Skeleton className="h-5 w-48" />
                ) : customer ? (
                  <div>
                    <Text size="small">
                      {customer.first_name && customer.last_name 
                        ? `${customer.first_name} ${customer.last_name}` 
                        : customer.email}
                    </Text>
                    {customer.company_name && (
                      <Text size="small" className="text-ui-fg-subtle">
                        {customer.company_name}
                      </Text>
                    )}
                  </div>
                ) : (
                  <Text size="small" className="text-ui-fg-muted">No customer assigned</Text>
                )}
              </div>

              {/* Machine */}
              <div className="min-w-0">
                <Label size="small" weight="plus" className="mb-2">
                  Machine
                </Label>
                {machineLoading ? (
                  <Skeleton className="h-5 w-48" />
                ) : machine ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Label size="small" weight="plus" className="text-ui-fg-subtle">
                        Brand:
                      </Label>
                      <Text size="small">
                        {machine.brand_name || 'Unknown Brand'}
                      </Text>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label size="small" weight="plus" className="text-ui-fg-subtle">
                        Model:
                      </Label>
                      <Text size="small">
                        {machine.model_number}
                      </Text>
                    </div>
                    {machine.serial_number && (
                      <div className="flex items-center gap-2">
                        <Label size="small" weight="plus" className="text-ui-fg-subtle">
                          Serial Number:
                        </Label>
                        <Text size="small">
                          {machine.serial_number}
                        </Text>
                      </div>
                    )}
                    {machine.year && (
                      <div className="flex items-center gap-2">
                        <Label size="small" weight="plus" className="text-ui-fg-subtle">
                          Year:
                        </Label>
                        <Text size="small">
                          {machine.year}
                        </Text>
                      </div>
                    )}
                  </div>
                ) : (
                  <Text size="small" className="text-ui-fg-muted">No machine assigned</Text>
                )}
              </div>

              {/* Technician */}
              <div className="min-w-0">
                <Label size="small" weight="plus" className="mb-2">
                  Assigned Technician
                </Label>
                {technicianLoading ? (
                  <Skeleton className="h-5 w-48" />
                ) : technician ? (
                  <div className="space-y-1">
                    <Text size="small">
                      {technician.first_name && technician.last_name 
                        ? `${technician.first_name} ${technician.last_name}` 
                        : technician.email}
                    </Text>
                    {technician.employee_id && (
                      <div className="flex items-center gap-2">
                        <Label size="small" weight="plus" className="text-ui-fg-subtle">
                          Employee ID:
                        </Label>
                        <Text size="small">
                          {technician.employee_id}
                        </Text>
                      </div>
                    )}
                    {technician.department && (
                      <div className="flex items-center gap-2">
                        <Label size="small" weight="plus" className="text-ui-fg-subtle">
                          Department:
                        </Label>
                        <Text size="small">
                          {technician.department}
                        </Text>
                      </div>
                    )}
                  </div>
                ) : (
                  <Text size="small" className="text-ui-fg-muted">No technician assigned</Text>
                )}
              </div>
            </div>
          </div>

          {/* Priority Section - Status and Service Type now in header */}
          <div className="px-6 py-4">
            <div className="min-w-0 flex flex-col">
              <Label size="small" weight="plus" className="mb-2">
                Priority
              </Label>
              <StatusBadge color={priorityVariants[serviceOrder.priority as keyof typeof priorityVariants]}>
                {serviceOrder.priority}
              </StatusBadge>
            </div>
          </div>

          {/* Notes Section */}
          {(serviceOrder.internal_notes || serviceOrder.customer_notes) && (
            <div className="px-6 py-4">
              <div className="min-w-0">
                <Label size="small" weight="plus" className="mb-2">
                  Notes
                </Label>
                {serviceOrder.internal_notes && (
                  <div className="flex items-start gap-2 mb-2">
                    <Label size="small" weight="plus" className="text-ui-fg-subtle">
                      Internal:
                    </Label>
                    <Text size="small">{serviceOrder.internal_notes}</Text>
                  </div>
                )}
                {serviceOrder.customer_notes && (
                  <div className="flex items-start gap-2">
                    <Label size="small" weight="plus" className="text-ui-fg-subtle">
                      Customer:
                    </Label>
                    <Text size="small">{serviceOrder.customer_notes}</Text>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Metadata Section */}
          <div className="px-6 py-4 bg-ui-bg-subtle">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label size="small" weight="plus" className="text-ui-fg-subtle mb-1 block">
                  Created
                </Label>
                <Text size="small" className="text-ui-fg-muted">
                  {new Date(serviceOrder.created_at).toLocaleDateString()}
                </Text>
              </div>
              <div>
                <Label size="small" weight="plus" className="text-ui-fg-subtle mb-1 block">
                  Updated
                </Label>
                <Text size="small" className="text-ui-fg-muted">
                  {new Date(serviceOrder.updated_at).toLocaleDateString()}
                </Text>
              </div>
            </div>
          </div>
        </>
      )}
    </Container>
  )
}

export default ServiceOrderOverviewWidget