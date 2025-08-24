import { Container, Heading, Checkbox, Label } from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"

interface ServiceOrder {
  id: string
  service_order_number: string
  has_appointment: boolean
  needs_replacement_vehicle: boolean
  includes_minor_maintenance: boolean
  includes_major_maintenance: boolean
  is_repeated_repair: boolean
  includes_cleaning: boolean
  est_used: boolean
  ca_used: boolean
}

interface ServiceOrderCharacteristicsWidgetProps {
  data: ServiceOrder
}

const ServiceOrderCharacteristicsWidget = ({ data: serviceOrder }: ServiceOrderCharacteristicsWidgetProps) => {
  const queryClient = useQueryClient()

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
    },
  })

  const handleCheckboxChange = (fieldName: string, checked: boolean) => {
    updateMutation.mutate({ [fieldName]: checked })
  }

  if (!serviceOrder) {
    return null
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Service Characteristics</Heading>
      </div>
      
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Left Column */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="has_appointment"
                checked={serviceOrder.has_appointment}
                onCheckedChange={(checked) => handleCheckboxChange('has_appointment', checked as boolean)}
                disabled={updateMutation.isPending}
              />
              <Label htmlFor="has_appointment" size="small">
                Appointment
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="needs_replacement_vehicle"
                checked={serviceOrder.needs_replacement_vehicle}
                onCheckedChange={(checked) => handleCheckboxChange('needs_replacement_vehicle', checked as boolean)}
                disabled={updateMutation.isPending}
              />
              <Label htmlFor="needs_replacement_vehicle" size="small">
                Replacement Vehicle
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="is_repeated_repair"
                checked={serviceOrder.is_repeated_repair}
                onCheckedChange={(checked) => handleCheckboxChange('is_repeated_repair', checked as boolean)}
                disabled={updateMutation.isPending}
              />
              <Label htmlFor="is_repeated_repair" size="small">
                Repeated Repair
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="est_used"
                checked={serviceOrder.est_used}
                onCheckedChange={(checked) => handleCheckboxChange('est_used', checked as boolean)}
                disabled={updateMutation.isPending}
              />
              <Label htmlFor="est_used" size="small">
                EST Used
              </Label>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="includes_minor_maintenance"
                checked={serviceOrder.includes_minor_maintenance}
                onCheckedChange={(checked) => handleCheckboxChange('includes_minor_maintenance', checked as boolean)}
                disabled={updateMutation.isPending}
              />
              <Label htmlFor="includes_minor_maintenance" size="small">
                Minor Maintenance
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="includes_major_maintenance"
                checked={serviceOrder.includes_major_maintenance}
                onCheckedChange={(checked) => handleCheckboxChange('includes_major_maintenance', checked as boolean)}
                disabled={updateMutation.isPending}
              />
              <Label htmlFor="includes_major_maintenance" size="small">
                Major Maintenance
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="includes_cleaning"
                checked={serviceOrder.includes_cleaning}
                onCheckedChange={(checked) => handleCheckboxChange('includes_cleaning', checked as boolean)}
                disabled={updateMutation.isPending}
              />
              <Label htmlFor="includes_cleaning" size="small">
                Cleaning
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="ca_used"
                checked={serviceOrder.ca_used}
                onCheckedChange={(checked) => handleCheckboxChange('ca_used', checked as boolean)}
                disabled={updateMutation.isPending}
              />
              <Label htmlFor="ca_used" size="small">
                CA
              </Label>
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}

export default ServiceOrderCharacteristicsWidget

