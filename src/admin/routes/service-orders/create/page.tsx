import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowLeft, Plus } from "@medusajs/icons"
import {
  Button,
  Container,
  Heading,
  Text,
  Input,
  Textarea,
  Select,
  DatePicker,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"

const CreateServiceOrder = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    description: '',
    service_type: 'normal',
    priority: 'normal',
    customer_id: '',
    technician_id: '',
    customer_complaint: '',
    scheduled_start_date: '',
    scheduled_end_date: '',
    estimated_hours: 0,
    labor_rate: 85,
    diagnosis: '',
    notes: '',
  })

  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await fetch('/admin/customers?limit=100')
      if (!response.ok) throw new Error('Failed to fetch customers')
      const data = await response.json()
      return data.customers || []
    },
  })

  // Fetch technicians
  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: async () => {
      const response = await fetch('/admin/technicians?limit=100&status=active')
      if (!response.ok) throw new Error('Failed to fetch technicians')
      const data = await response.json()
      return data.technicians || []
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        scheduled_start_date: data.scheduled_start_date ? new Date(data.scheduled_start_date).toISOString() : undefined,
        scheduled_end_date: data.scheduled_end_date ? new Date(data.scheduled_end_date).toISOString() : undefined,
      }
      
      const response = await fetch('/admin/service-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Failed to create service order')
      }
      
      return response.json()
    },
    onSuccess: (data) => {
      toast.success('Service order created successfully!')
      navigate(`/service-orders/${data.service_order.id}`)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.description.trim()) {
      toast.error('Description is required')
      return
    }
    if (!formData.customer_id) {
      toast.error('Customer is required')
      return
    }
    createMutation.mutate(formData)
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Container>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button size="small" variant="transparent" asChild>
          <Link to="/service-orders">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <Heading level="h1">Create Service Order</Heading>
          <Text className="text-ui-fg-subtle">
            Create a new repair or maintenance work order
          </Text>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-ui-surface-base rounded-lg p-6">
              <Heading level="h3">Service Details</Heading>
              <Text size="small" className="text-ui-fg-subtle">
                Basic information about the service order
              </Text>
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Customer *
                    </label>
                    <Select
                      value={formData.customer_id}
                      onValueChange={(value) => handleInputChange('customer_id', value)}
                    >
                      <Select.Trigger>
                        <Select.Value placeholder="Select a customer" />
                      </Select.Trigger>
                      <Select.Content>
                        {customers.map((customer: any) => (
                          <Select.Item key={customer.id} value={customer.id}>
                            {customer.first_name && customer.last_name 
                              ? `${customer.first_name} ${customer.last_name}` 
                              : customer.email}
                            {customer.company_name && ` (${customer.company_name})`}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Assigned Technician
                    </label>
                    <Select
                      value={formData.technician_id}
                      onValueChange={(value) => handleInputChange('technician_id', value)}
                    >
                      <Select.Trigger>
                        <Select.Value placeholder="Select a technician" />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="">No technician assigned</Select.Item>
                        {technicians.map((technician: any) => (
                          <Select.Item key={technician.id} value={technician.id}>
                            {technician.first_name} {technician.last_name}
                            {technician.position && ` - ${technician.position}`}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description *
                  </label>
                  <Textarea
                    placeholder="Describe the work to be performed..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    required
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Customer Complaint
                  </label>
                  <Textarea
                    placeholder="What issue is the customer experiencing?"
                    value={formData.customer_complaint}
                    onChange={(e) => handleInputChange('customer_complaint', e.target.value)}
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Initial Diagnosis
                  </label>
                  <Textarea
                    placeholder="Initial assessment of the problem..."
                    value={formData.diagnosis}
                    onChange={(e) => handleInputChange('diagnosis', e.target.value)}
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Additional Notes
                  </label>
                  <Textarea
                    placeholder="Any additional information..."
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <div className="bg-ui-surface-base rounded-lg p-6">
              <Heading level="h3">Scheduling</Heading>
              <Text size="small" className="text-ui-fg-subtle">
                Schedule the service work
              </Text>
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Scheduled Start Date
                    </label>
                    <Input
                      type="datetime-local"
                      value={formData.scheduled_start_date}
                      onChange={(e) => handleInputChange('scheduled_start_date', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Scheduled End Date
                    </label>
                    <Input
                      type="datetime-local"
                      value={formData.scheduled_end_date}
                      onChange={(e) => handleInputChange('scheduled_end_date', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Estimated Hours
                    </label>
                    <Input
                      type="number"
                      step="0.25"
                      min="0"
                      placeholder="0"
                      value={formData.estimated_hours}
                      onChange={(e) => handleInputChange('estimated_hours', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Labor Rate ($/hour)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="85.00"
                      value={formData.labor_rate}
                      onChange={(e) => handleInputChange('labor_rate', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-ui-surface-base rounded-lg p-6">
              <Heading level="h3">Classification</Heading>
              <Text size="small" className="text-ui-fg-subtle">
                Categorize this service order
              </Text>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Service Type
                  </label>
                  <Select
                    value={formData.service_type}
                    onValueChange={(value) => handleInputChange('service_type', value)}
                  >
                    <Select.Trigger>
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="normal">Normal Repair</Select.Item>
                      <Select.Item value="warranty">Warranty Work</Select.Item>
                      <Select.Item value="setup">Equipment Setup</Select.Item>
                      <Select.Item value="emergency">Emergency Repair</Select.Item>
                      <Select.Item value="preventive">Preventive Maintenance</Select.Item>
                    </Select.Content>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Priority Level
                  </label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => handleInputChange('priority', value)}
                  >
                    <Select.Trigger>
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="low">Low Priority</Select.Item>
                      <Select.Item value="normal">Normal Priority</Select.Item>
                      <Select.Item value="high">High Priority</Select.Item>
                      <Select.Item value="urgent">Urgent</Select.Item>
                    </Select.Content>
                  </Select>
                </div>
              </div>
            </div>

            <div className="bg-ui-surface-base rounded-lg p-6">
              <Heading level="h3">Cost Estimate</Heading>
              <Text size="small" className="text-ui-fg-subtle">
                Estimated labor cost
              </Text>
              <div className="mt-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <Text>Estimated Hours:</Text>
                  <Text>{formData.estimated_hours || 0}h</Text>
                </div>
                <div className="flex justify-between text-sm">
                  <Text>Labor Rate:</Text>
                  <Text>${formData.labor_rate}/hr</Text>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <Text weight="plus">Estimated Labor Cost:</Text>
                  <Text weight="plus">
                    ${((formData.estimated_hours || 0) * (formData.labor_rate || 0)).toFixed(2)}
                  </Text>
                </div>
                <Text size="small" className="text-ui-fg-subtle">
                  * Parts cost will be added separately
                </Text>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending}
              >
                <Plus className="w-4 h-4" />
                {createMutation.isPending ? 'Creating...' : 'Create Service Order'}
              </Button>
              <Button variant="secondary" className="w-full" asChild>
                <Link to="/service-orders">
                  Cancel
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Create Service Order",
})

export default CreateServiceOrder 