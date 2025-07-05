import React, { useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowLeft, Plus } from "@medusajs/icons"
import { 
  Container, 
  Heading, 
  Button, 
  Input, 
  Select, 
  Textarea, 
  Text,
  Badge,
  toast
} from "@medusajs/ui"
import { Link, useNavigate } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"

// Types for form data
interface MachineFormData {
  brand: string
  model: string
  serial_number: string
  year: string
  engine_hours?: string
  fuel_type: string
  horsepower?: string
  weight?: string
  purchase_date?: string
  purchase_price?: string
  current_value?: string
  status: "active" | "inactive" | "maintenance"
  location?: string
  notes?: string
  customer_id?: string
}

// Create machine mutation
const useCreateMachine = () => {
  return useMutation({
    mutationFn: async (data: MachineFormData) => {
      const response = await fetch("/admin/machines", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        throw new Error("Failed to create machine")
      }
      
      return response.json()
    },
  })
}

const CreateMachinePage = () => {
  const navigate = useNavigate()
  const createMachineMutation = useCreateMachine()
  
  // Form state
  const [formData, setFormData] = useState<MachineFormData>({
    brand: "",
    model: "",
    serial_number: "",
    year: "",
    engine_hours: "",
    fuel_type: "diesel",
    horsepower: "",
    weight: "",
    purchase_date: "",
    purchase_price: "",
    current_value: "",
    status: "active",
    location: "",
    notes: "",
    customer_id: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.brand.trim()) {
      newErrors.brand = "Brand is required"
    }
    if (!formData.model.trim()) {
      newErrors.model = "Model is required"
    }
    if (!formData.serial_number.trim()) {
      newErrors.serial_number = "Serial number is required"
    }
    if (!formData.year.trim()) {
      newErrors.year = "Year is required"
    }
    if (!formData.fuel_type) {
      newErrors.fuel_type = "Fuel type is required"
    }

    // Validate year is a number
    if (formData.year && isNaN(Number(formData.year))) {
      newErrors.year = "Year must be a valid number"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      await createMachineMutation.mutateAsync(formData)
      toast.success("Machine created successfully!")
      navigate("/machines")
    } catch (error) {
      toast.error("Failed to create machine. Please try again.")
    }
  }

  // Handle input changes
  const handleInputChange = (field: keyof MachineFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  return (
    <div className="flex h-full w-full flex-col">
      {/* Header */}
      <div className="flex-1 overflow-hidden">
        <div className="bg-ui-bg-base border border-ui-border-base rounded-lg overflow-hidden h-full flex flex-col">
          {/* Header inside card */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-base">
            <div className="flex items-center gap-4">
              <Button 
                variant="secondary" 
                size="small" 
                onClick={() => navigate("/machines")}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <Heading level="h1">Create New Machine</Heading>
                <Text className="text-ui-fg-subtle">
                  Add a new machine to your fleet
                </Text>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-auto p-6">
            <form onSubmit={handleSubmit} className="max-w-4xl">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
                  <Heading level="h3" className="mb-4">
                    Basic Information
                  </Heading>
                  <div className="space-y-4">
                    <div>
                      <Input
                        label="Brand"
                        placeholder="Enter machine brand"
                        value={formData.brand}
                        onChange={(e) => handleInputChange("brand", e.target.value)}
                        error={errors.brand}
                        required
                      />
                    </div>
                    <div>
                      <Input
                        label="Model"
                        placeholder="Enter machine model"
                        value={formData.model}
                        onChange={(e) => handleInputChange("model", e.target.value)}
                        error={errors.model}
                        required
                      />
                    </div>
                    <div>
                      <Input
                        label="Serial Number"
                        placeholder="Enter serial number"
                        value={formData.serial_number}
                        onChange={(e) => handleInputChange("serial_number", e.target.value)}
                        error={errors.serial_number}
                        required
                      />
                    </div>
                    <div>
                      <Input
                        label="Year"
                        placeholder="Enter manufacturing year"
                        value={formData.year}
                        onChange={(e) => handleInputChange("year", e.target.value)}
                        error={errors.year}
                        required
                      />
                    </div>
                    <div>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => handleInputChange("status", value as "active" | "inactive" | "maintenance")}
                      >
                        <Select.Trigger>
                          <Select.Value placeholder="Select status" />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="active">
                            <div className="flex items-center gap-2">
                              <Badge variant="green" size="small">Active</Badge>
                            </div>
                          </Select.Item>
                          <Select.Item value="inactive">
                            <div className="flex items-center gap-2">
                              <Badge variant="red" size="small">Inactive</Badge>
                            </div>
                          </Select.Item>
                          <Select.Item value="maintenance">
                            <div className="flex items-center gap-2">
                              <Badge variant="orange" size="small">Maintenance</Badge>
                            </div>
                          </Select.Item>
                        </Select.Content>
                      </Select>
                    </div>
                    <div>
                      <Select
                        value={formData.fuel_type}
                        onValueChange={(value) => handleInputChange("fuel_type", value)}
                      >
                        <Select.Trigger>
                          <Select.Value placeholder="Select fuel type" />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="diesel">Diesel</Select.Item>
                          <Select.Item value="petrol">Petrol</Select.Item>
                          <Select.Item value="electric">Electric</Select.Item>
                          <Select.Item value="hybrid">Hybrid</Select.Item>
                          <Select.Item value="lpg">LPG</Select.Item>
                        </Select.Content>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Technical Specifications */}
                <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
                  <Heading level="h3" className="mb-4">
                    Technical Specifications
                  </Heading>
                  <div className="space-y-4">
                    <div>
                      <Input
                        label="Engine Hours"
                        placeholder="Enter engine hours"
                        value={formData.engine_hours}
                        onChange={(e) => handleInputChange("engine_hours", e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        label="Horsepower"
                        placeholder="Enter horsepower"
                        value={formData.horsepower}
                        onChange={(e) => handleInputChange("horsepower", e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        label="Weight"
                        placeholder="Enter weight (kg)"
                        value={formData.weight}
                        onChange={(e) => handleInputChange("weight", e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        label="Location"
                        placeholder="Enter current location"
                        value={formData.location}
                        onChange={(e) => handleInputChange("location", e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        label="Customer ID"
                        placeholder="Enter customer ID (optional)"
                        value={formData.customer_id}
                        onChange={(e) => handleInputChange("customer_id", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Financial Information */}
                <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
                  <Heading level="h3" className="mb-4">
                    Financial Information
                  </Heading>
                  <div className="space-y-4">
                    <div>
                      <Input
                        label="Purchase Date"
                        type="date"
                        value={formData.purchase_date}
                        onChange={(e) => handleInputChange("purchase_date", e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        label="Purchase Price"
                        placeholder="Enter purchase price"
                        value={formData.purchase_price}
                        onChange={(e) => handleInputChange("purchase_price", e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        label="Current Value"
                        placeholder="Enter current value"
                        value={formData.current_value}
                        onChange={(e) => handleInputChange("current_value", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
                  <Heading level="h3" className="mb-4">
                    Additional Information
                  </Heading>
                  <div className="space-y-4">
                    <div>
                      <Textarea
                        label="Notes"
                        placeholder="Enter any additional notes..."
                        value={formData.notes}
                        onChange={(e) => handleInputChange("notes", e.target.value)}
                        rows={4}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-ui-border-base">
                <Button 
                  variant="secondary" 
                  type="button" 
                  onClick={() => navigate("/machines")}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  type="submit"
                  disabled={createMachineMutation.isPending}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {createMachineMutation.isPending ? "Creating..." : "Create Machine"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Create Machine",
})

export default CreateMachinePage 