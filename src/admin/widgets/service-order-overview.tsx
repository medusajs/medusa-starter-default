import { Container, Heading, Text, Badge } from "@medusajs/ui"

interface ServiceOrder {
  id: string
  service_order_number: string
  description: string
  customer_complaint?: string
  service_type: string
  priority: string
  status: string
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
                <Badge variant="secondary">{serviceOrder.service_type}</Badge>
              </div>
              <div>
                <Text size="small" weight="plus" className="text-ui-fg-subtle mb-1">
                  Priority
                </Text>
                <Badge variant="secondary">{serviceOrder.priority}</Badge>
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