import { Container, Heading, Text, Badge, Skeleton, Button, Input, Select, Textarea } from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PencilSquare } from "@medusajs/icons"
import { useState } from "react"
import { useForm, Controller } from "react-hook-form"

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
  total_labor_cost?: number
  total_parts_cost?: number
  total_cost?: number
  estimated_hours?: number
  actual_hours?: number
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

  const form = useForm({
    defaultValues: {
      customer_id: serviceOrder?.customer_id || '',
      machine_id: serviceOrder?.machine_id || '',
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
    updateMutation.mutate(data)
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

  const serviceTypes = [
    'maintenance',
    'repair',
    'inspection', 
    'installation',
    'warranty',
    'emergency'
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
        <Heading level="h2">Service Details</Heading>
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
              <Text size="small" weight="plus" className="text-ui-fg-base">
                Customer
              </Text>
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
              <Text size="small" weight="plus" className="text-ui-fg-base">
                Machine/Equipment
              </Text>
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
              <Text size="small" weight="plus" className="text-ui-fg-base">
                Description
              </Text>
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
              <Text size="small" weight="plus" className="text-ui-fg-base">
                Service Type
              </Text>
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
              <Text size="small" weight="plus" className="text-ui-fg-base">
                Priority
              </Text>
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
        <div className="px-6 py-4">
          <div className="flex flex-col gap-y-4">
            {/* Customer Display */}
            <div className="flex flex-col space-y-1">
              <Text size="small" weight="plus" className="text-ui-fg-subtle">
                Customer
              </Text>
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

            {/* Machine Display */}
            <div className="flex flex-col space-y-1">
              <Text size="small" weight="plus" className="text-ui-fg-subtle">
                Machine/Equipment
              </Text>
              {machineLoading ? (
                <Skeleton className="h-5 w-48" />
              ) : machine ? (
                <div>
                  <Text size="small">
                    {machine.brand_name || 'Unknown Brand'} - {machine.model_number}
                  </Text>
                  {machine.serial_number && (
                    <Text size="small" className="text-ui-fg-subtle">
                      S/N: {machine.serial_number}
                    </Text>
                  )}
                  {machine.year && (
                    <Text size="small" className="text-ui-fg-subtle">
                      Year: {machine.year}
                    </Text>
                  )}
                </div>
              ) : (
                <Text size="small" className="text-ui-fg-muted">No machine assigned</Text>
              )}
            </div>

            {/* Description Display */}
            <div className="flex flex-col space-y-1">
              <Text size="small" weight="plus" className="text-ui-fg-subtle">
                Description
              </Text>
              <Text size="small">{serviceOrder.description}</Text>
            </div>
            
            {/* Service Type & Priority Display */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col space-y-1">
                <Text size="small" weight="plus" className="text-ui-fg-subtle">
                  Service Type
                </Text>
                <Badge size="2xsmall">{serviceOrder.service_type}</Badge>
              </div>
              <div className="flex flex-col space-y-1">
                <Text size="small" weight="plus" className="text-ui-fg-subtle">
                  Priority
                </Text>
                <Badge size="2xsmall" color={priorityVariants[serviceOrder.priority as keyof typeof priorityVariants]}>
                  {serviceOrder.priority}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}
    </Container>
  )
}

export default ServiceOrderOverviewWidget