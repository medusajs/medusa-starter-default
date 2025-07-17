import { Container, Heading, Text, Badge, Skeleton } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"

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

  if (!serviceOrder) {
    return null
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Service Details</Heading>
      </div>
      
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {/* Customer Information */}
            <div>
              <Text size="small" weight="plus" className="text-ui-fg-subtle mb-1">
                Customer
              </Text>
              {customerLoading ? (
                <Skeleton className="h-5 w-48" />
              ) : customer ? (
                <div>
                  <Text>
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
                <Text className="text-ui-fg-subtle">No customer assigned</Text>
              )}
            </div>

            {/* Machine Information */}
            <div>
              <Text size="small" weight="plus" className="text-ui-fg-subtle mb-1">
                Machine/Equipment
              </Text>
              {machineLoading ? (
                <Skeleton className="h-5 w-48" />
              ) : machine ? (
                <div>
                  <Text>{machine.brand_name || 'Unknown Brand'} - {machine.model_number}</Text>
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
                <Text className="text-ui-fg-subtle">No machine assigned</Text>
              )}
            </div>

            <div>
              <Text size="small" weight="plus" className="text-ui-fg-subtle mb-1">
                Description
              </Text>
              <Text>{serviceOrder.description}</Text>
            </div>
            
            {serviceOrder.customer_complaint && (
              <div>
                <Text size="small" weight="plus" className="text-ui-fg-subtle mb-1">
                  Customer Complaint
                </Text>
                <Text>{serviceOrder.customer_complaint}</Text>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Text size="small" weight="plus" className="text-ui-fg-subtle mb-1">
                  Service Type
                </Text>
                <Badge>{serviceOrder.service_type}</Badge>
              </div>
              <div>
                <Text size="small" weight="plus" className="text-ui-fg-subtle mb-1">
                  Priority
                </Text>
                <Badge>{serviceOrder.priority}</Badge>
              </div>
            </div>
          </div>
          
          <div>
            <div className="bg-ui-bg-subtle rounded-lg p-4">
              <Heading level="h3" className="mb-4">Cost Summary</Heading>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Text size="small">Labor Cost:</Text>
                  <Text size="small">${serviceOrder.total_labor_cost?.toFixed(2) || '0.00'}</Text>
                </div>
                <div className="flex justify-between">
                  <Text size="small">Parts Cost:</Text>
                  <Text size="small">${serviceOrder.total_parts_cost?.toFixed(2) || '0.00'}</Text>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <Text weight="plus">Total:</Text>
                  <Text weight="plus">${serviceOrder.total_cost?.toFixed(2) || '0.00'}</Text>
                </div>
                <div className="flex justify-between">
                  <Text size="small">Hours (Est/Actual):</Text>
                  <Text size="small">{serviceOrder.estimated_hours || 0}/{serviceOrder.actual_hours || 0}</Text>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}

export default ServiceOrderOverviewWidget