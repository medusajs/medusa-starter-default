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
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"

/**
 * CreateRentalPage Component
 *
 * Implements TEM-208: Build Rentals Admin UI - Create Rental Form
 *
 * This page allows users to create new rental orders by:
 * - Selecting a customer
 * - Selecting a machine
 * - Entering rental details (type, rates, dates)
 * - Setting starting machine hours
 * - Adding optional information (description, deposit, notes)
 */
const CreateRentalPage = () => {
  const navigate = useNavigate()

  // Form state - all required and optional fields for rental creation
  const [formData, setFormData] = useState({
    customer_id: '',
    machine_id: '',
    rental_type: 'hourly',
    start_machine_hours: 0,
    hourly_rate: 0,
    daily_rate: 0,
    weekly_rate: 0,
    monthly_rate: 0,
    rental_start_date: '',
    expected_return_date: '',
    description: '',
    deposit_amount: 0,
    notes: '',
  })

  // Fetch customers for dropdown
  const { data: customers = [] } = useQuery({
    queryKey: ['rentals-create-customers'],
    queryFn: async () => {
      const response = await fetch('/admin/customers?limit=100')
      if (!response.ok) throw new Error('Failed to fetch customers')
      const data = await response.json()
      return data.customers || []
    },
  })

  // Fetch machines for dropdown - filter by customer and availability
  const { data: machinesData = [] } = useQuery({
    queryKey: ['rentals-create-machines', formData.customer_id],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: '100',
        status: 'active',
        ...(formData.customer_id && { customer_id: formData.customer_id })
      })
      const response = await fetch(`/admin/machines?${params}`)
      if (!response.ok) throw new Error('Failed to fetch machines')
      const data = await response.json()
      return data.machines || []
    },
    enabled: !!formData.customer_id, // Only fetch when customer is selected
  })

  const machines = Array.isArray(machinesData) ? machinesData : []

  // Create rental mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        customer_id: data.customer_id,
        machine_id: data.machine_id,
        rental_type: data.rental_type,
        start_machine_hours: data.start_machine_hours,
        hourly_rate: data.hourly_rate * 100, // Convert to cents
        daily_rate: data.daily_rate * 100,
        weekly_rate: data.weekly_rate * 100,
        monthly_rate: data.monthly_rate * 100,
        rental_start_date: data.rental_start_date ? new Date(data.rental_start_date).toISOString() : undefined,
        expected_return_date: data.expected_return_date ? new Date(data.expected_return_date).toISOString() : undefined,
        description: data.description || undefined,
        deposit_amount: data.deposit_amount * 100, // Convert to cents
        notes: data.notes || undefined,
      }

      const response = await fetch('/admin/rentals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Failed to create rental')
      }

      return response.json()
    },
    onSuccess: (data) => {
      toast.success('Rental created successfully!')
      navigate(`/rentals/${data.rental.id}`)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Form submission handler with validation
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validation: Customer is required
    if (!formData.customer_id) {
      toast.error('Customer is required')
      return
    }

    // Validation: Machine is required
    if (!formData.machine_id) {
      toast.error('Machine is required')
      return
    }

    // Validation: Start hours must be >= 0
    if (formData.start_machine_hours < 0) {
      toast.error('Start machine hours must be greater than or equal to 0')
      return
    }

    // Validation: Expected return date must be after start date
    if (formData.rental_start_date && formData.expected_return_date) {
      const startDate = new Date(formData.rental_start_date)
      const endDate = new Date(formData.expected_return_date)
      if (endDate <= startDate) {
        toast.error('Expected return date must be after start date')
        return
      }
    }

    // Validation: Rate must be > 0 based on rental type
    const rateField = `${formData.rental_type}_rate` as keyof typeof formData
    if (formData[rateField] === 0 || formData[rateField] === '') {
      toast.error(`${formData.rental_type.charAt(0).toUpperCase() + formData.rental_type.slice(1)} rate must be greater than 0`)
      return
    }

    createMutation.mutate(formData)
  }

  // Handle input changes
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      // Clear machine selection when customer changes
      if (field === 'customer_id') {
        newData.machine_id = ''
      }
      return newData
    })
  }

  return (
    <Container>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button size="small" variant="transparent" asChild>
          <Link to="/rentals">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <Heading level="h1">Create Rental</Heading>
          <Text className="text-ui-fg-subtle">
            Create a new machine rental order
          </Text>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Rental Details Section */}
            <div className="bg-ui-surface-base rounded-lg p-6">
              <Heading level="h3">Rental Details</Heading>
              <Text size="small" className="text-ui-fg-subtle">
                Basic information about the rental order
              </Text>
              <div className="mt-6 space-y-4">
                {/* Customer and Machine Selection */}
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
                      Machine *
                    </label>
                    <Select
                      value={formData.machine_id}
                      onValueChange={(value) => handleInputChange('machine_id', value)}
                      disabled={!formData.customer_id}
                    >
                      <Select.Trigger>
                        <Select.Value placeholder={formData.customer_id ? "Select a machine" : "Select customer first"} />
                      </Select.Trigger>
                      <Select.Content>
                        {machines.map((machine: any) => (
                          <Select.Item key={machine.id} value={machine.id}>
                            {machine.name || 'Unnamed Machine'} - {machine.serial_number}
                          </Select.Item>
                        ))}
                        {machines.length === 0 && formData.customer_id && (
                          <Select.Item value="no-machines" disabled>
                            No machines available for this customer
                          </Select.Item>
                        )}
                      </Select.Content>
                    </Select>
                  </div>
                </div>

                {/* Rental Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Rental Type *
                    </label>
                    <Select
                      value={formData.rental_type}
                      onValueChange={(value) => handleInputChange('rental_type', value)}
                    >
                      <Select.Trigger>
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="hourly">Hourly</Select.Item>
                        <Select.Item value="daily">Daily</Select.Item>
                        <Select.Item value="weekly">Weekly</Select.Item>
                        <Select.Item value="monthly">Monthly</Select.Item>
                      </Select.Content>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Start Machine Hours *
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="0"
                      value={formData.start_machine_hours}
                      onChange={(e) => handleInputChange('start_machine_hours', parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                </div>

                {/* Rate Inputs - Conditional based on rental type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formData.rental_type === 'hourly' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Hourly Rate (€) *
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formData.hourly_rate}
                        onChange={(e) => handleInputChange('hourly_rate', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                  )}
                  {formData.rental_type === 'daily' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Daily Rate (€) *
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formData.daily_rate}
                        onChange={(e) => handleInputChange('daily_rate', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                  )}
                  {formData.rental_type === 'weekly' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Weekly Rate (€) *
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formData.weekly_rate}
                        onChange={(e) => handleInputChange('weekly_rate', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                  )}
                  {formData.rental_type === 'monthly' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Monthly Rate (€) *
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formData.monthly_rate}
                        onChange={(e) => handleInputChange('monthly_rate', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Deposit Amount (€)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.deposit_amount}
                      onChange={(e) => handleInputChange('deposit_amount', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Date Pickers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Start Date *
                    </label>
                    <Input
                      type="datetime-local"
                      value={formData.rental_start_date}
                      onChange={(e) => handleInputChange('rental_start_date', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Expected Return Date *
                    </label>
                    <Input
                      type="datetime-local"
                      value={formData.expected_return_date}
                      onChange={(e) => handleInputChange('expected_return_date', e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description
                  </label>
                  <Textarea
                    placeholder="Describe the rental purpose or any specific details..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Notes
                  </label>
                  <Textarea
                    placeholder="Additional notes or special instructions..."
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-ui-surface-base rounded-lg p-6">
              <Heading level="h3">Rental Summary</Heading>
              <Text size="small" className="text-ui-fg-subtle">
                Quick overview of the rental
              </Text>
              <div className="mt-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <Text>Rental Type:</Text>
                  <Text weight="plus">
                    {formData.rental_type.charAt(0).toUpperCase() + formData.rental_type.slice(1)}
                  </Text>
                </div>
                <div className="flex justify-between text-sm">
                  <Text>Rate:</Text>
                  <Text weight="plus">
                    €{(formData[`${formData.rental_type}_rate` as keyof typeof formData] as number || 0).toFixed(2)}/{formData.rental_type === 'hourly' ? 'hr' : formData.rental_type === 'daily' ? 'day' : formData.rental_type === 'weekly' ? 'wk' : 'mo'}
                  </Text>
                </div>
                {formData.deposit_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <Text>Deposit:</Text>
                    <Text weight="plus">€{formData.deposit_amount.toFixed(2)}</Text>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <Text>Start Hours:</Text>
                  <Text weight="plus">{formData.start_machine_hours}h</Text>
                </div>
                {formData.customer_id && (
                  <div className="flex justify-between text-sm border-t pt-2">
                    <Text>Customer:</Text>
                    <Text weight="plus">Selected</Text>
                  </div>
                )}
                {formData.machine_id && (
                  <div className="flex justify-between text-sm">
                    <Text>Machine:</Text>
                    <Text weight="plus">Selected</Text>
                  </div>
                )}
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
                {createMutation.isPending ? 'Creating...' : 'Create Rental'}
              </Button>
              <Button variant="secondary" className="w-full" asChild>
                <Link to="/rentals">
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
  label: "Create Rental",
})

export const handle = {
  breadcrumb: () => "Create",
}

export default CreateRentalPage
