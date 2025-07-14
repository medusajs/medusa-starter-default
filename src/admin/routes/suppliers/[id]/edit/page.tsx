import React, { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowLeft, CheckCircle } from "@medusajs/icons"
import { 
  Container, 
  Heading, 
  Button, 
  Input, 
  Select, 
  Textarea, 
  Text,
  Badge,
  toast,
  Label
} from "@medusajs/ui"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery } from "@tanstack/react-query"

// Types for form data
interface SupplierFormData {
  name: string
  code?: string
  email?: string
  phone?: string
  website?: string
  contact_person?: string
  address_line_1?: string
  address_line_2?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  tax_id?: string
  payment_terms?: string
  currency_code: "EUR" | "USD" | "GBP" | "CAD" | "AUD" | "JPY" | "CHF" | "SEK" | "NOK" | "DKK"
  is_active: boolean
  notes?: string
}

// Fetch supplier data
const useSupplier = (id: string) => {
  return useQuery({
    queryKey: ["supplier", id],
    queryFn: async () => {
      const response = await fetch(`/admin/suppliers/${id}`)
      if (!response.ok) {
        throw new Error("Failed to fetch supplier")
      }
      const data = await response.json()
      return data.supplier
    },
    enabled: !!id,
  })
}

// Update supplier mutation
const useUpdateSupplier = () => {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SupplierFormData }) => {
      const response = await fetch(`/admin/suppliers/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          code: data.code || null,
          email: data.email || null,
          phone: data.phone || null,
          website: data.website || null,
          contact_person: data.contact_person || null,
          address_line_1: data.address_line_1 || null,
          address_line_2: data.address_line_2 || null,
          city: data.city || null,
          state: data.state || null,
          postal_code: data.postal_code || null,
          country: data.country || null,
          tax_id: data.tax_id || null,
          payment_terms: data.payment_terms || null,
          notes: data.notes || null,
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to update supplier")
      }
      
      return response.json()
    },
  })
}

const EditSupplierPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const updateSupplierMutation = useUpdateSupplier()
  const { data: supplier, isLoading, error } = useSupplier(id!)
  
  // Form state
  const [formData, setFormData] = useState<SupplierFormData>({
    name: "",
    code: "",
    email: "",
    phone: "",
    website: "",
    contact_person: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    tax_id: "",
    payment_terms: "",
    currency_code: "EUR",
    is_active: true,
    notes: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load supplier data into form when available
  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || "",
        code: supplier.code || "",
        email: supplier.email || "",
        phone: supplier.phone || "",
        website: supplier.website || "",
        contact_person: supplier.contact_person || "",
        address_line_1: supplier.address_line_1 || "",
        address_line_2: supplier.address_line_2 || "",
        city: supplier.city || "",
        state: supplier.state || "",
        postal_code: supplier.postal_code || "",
        country: supplier.country || "",
        tax_id: supplier.tax_id || "",
        payment_terms: supplier.payment_terms || "",
        currency_code: supplier.currency_code || "EUR",
        is_active: supplier.is_active ?? true,
        notes: supplier.notes || "",
      })
    }
  }, [supplier])

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Name is required"
    }

    // Validate email format if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    // Validate website URL format if provided
    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = "Please enter a valid URL (starting with http:// or https://)"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || !id) {
      return
    }

    try {
      await updateSupplierMutation.mutateAsync({ id, data: formData })
      toast.success("Supplier updated successfully!")
      navigate(`/suppliers/${id}`)
    } catch (error) {
      toast.error("Failed to update supplier. Please try again.")
    }
  }

  // Handle input changes
  const handleInputChange = (field: keyof SupplierFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Text>Loading supplier details...</Text>
      </div>
    )
  }

  if (error || !supplier) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Text className="text-ui-fg-error">
          Failed to load supplier details. Please try again.
        </Text>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col">
      {/* Header */}
      <div className="flex-1 overflow-hidden">
        <div className="bg-ui-bg-base border border-ui-border-base rounded-lg overflow-hidden h-full flex flex-col">
          {/* Header inside card */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-base">
            <div className="flex items-center gap-4">
              <Button variant="secondary" size="small" asChild>
                <Link to={`/suppliers/${id}`}>
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
              <div>
                <Heading level="h1">Edit Supplier</Heading>
                <Text className="text-ui-fg-subtle">
                  {supplier.name} {supplier.code && `(${supplier.code})`}
                </Text>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleSubmit} className="max-w-4xl">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
                  <Heading level="h3" className="mb-4">
                    Basic Information
                  </Heading>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label size="small" weight="plus">
                        Name *
                      </Label>
                      <Input
                        placeholder="Enter supplier name"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                      />
                      {errors.name && (
                        <Text size="xsmall" className="text-red-500">
                          {errors.name}
                        </Text>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label size="small" weight="plus">
                        Code
                      </Label>
                      <Input
                        placeholder="Enter supplier code (optional)"
                        value={formData.code || ""}
                        onChange={(e) => handleInputChange("code", e.target.value)}
                      />
                      {errors.code && (
                        <Text size="xsmall" className="text-red-500">
                          {errors.code}
                        </Text>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label size="small" weight="plus">
                        Email
                      </Label>
                      <Input
                        type="email"
                        placeholder="Enter email address"
                        value={formData.email || ""}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                      />
                      {errors.email && (
                        <Text size="xsmall" className="text-red-500">
                          {errors.email}
                        </Text>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label size="small" weight="plus">
                        Phone
                      </Label>
                      <Input
                        placeholder="Enter phone number"
                        value={formData.phone || ""}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                      />
                      {errors.phone && (
                        <Text size="xsmall" className="text-red-500">
                          {errors.phone}
                        </Text>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label size="small" weight="plus">
                        Website
                      </Label>
                      <Input
                        placeholder="Enter website URL"
                        value={formData.website || ""}
                        onChange={(e) => handleInputChange("website", e.target.value)}
                      />
                      {errors.website && (
                        <Text size="xsmall" className="text-red-500">
                          {errors.website}
                        </Text>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label size="small" weight="plus">
                        Contact Person
                      </Label>
                      <Input
                        placeholder="Enter contact person name"
                        value={formData.contact_person || ""}
                        onChange={(e) => handleInputChange("contact_person", e.target.value)}
                      />
                      {errors.contact_person && (
                        <Text size="xsmall" className="text-red-500">
                          {errors.contact_person}
                        </Text>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label size="small" weight="plus">
                        Status
                      </Label>
                      <Select
                        value={formData.is_active ? "active" : "inactive"}
                        onValueChange={(value) => handleInputChange("is_active", value === "active")}
                      >
                        <Select.Trigger>
                          <Select.Value placeholder="Select status" />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="active">
                            <div className="flex items-center gap-2">
                              <Badge color="green" size="2xsmall">Active</Badge>
                            </div>
                          </Select.Item>
                          <Select.Item value="inactive">
                            <div className="flex items-center gap-2">
                              <Badge color="red" size="2xsmall">Inactive</Badge>
                            </div>
                          </Select.Item>
                        </Select.Content>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
                  <Heading level="h3" className="mb-4">
                    Address Information
                  </Heading>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label size="small" weight="plus">
                        Address Line 1
                      </Label>
                      <Input
                        placeholder="Enter street address"
                        value={formData.address_line_1 || ""}
                        onChange={(e) => handleInputChange("address_line_1", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label size="small" weight="plus">
                        Address Line 2
                      </Label>
                      <Input
                        placeholder="Enter apartment, suite, etc."
                        value={formData.address_line_2 || ""}
                        onChange={(e) => handleInputChange("address_line_2", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label size="small" weight="plus">
                        City
                      </Label>
                      <Input
                        placeholder="Enter city"
                        value={formData.city || ""}
                        onChange={(e) => handleInputChange("city", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label size="small" weight="plus">
                        State/Province
                      </Label>
                      <Input
                        placeholder="Enter state or province"
                        value={formData.state || ""}
                        onChange={(e) => handleInputChange("state", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label size="small" weight="plus">
                        Postal Code
                      </Label>
                      <Input
                        placeholder="Enter postal code"
                        value={formData.postal_code || ""}
                        onChange={(e) => handleInputChange("postal_code", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label size="small" weight="plus">
                        Country
                      </Label>
                      <Input
                        placeholder="Enter country"
                        value={formData.country || ""}
                        onChange={(e) => handleInputChange("country", e.target.value)}
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
                    <div className="space-y-2">
                      <Label size="small" weight="plus">
                        Tax ID / VAT Number
                      </Label>
                      <Input
                        placeholder="Enter tax identification number"
                        value={formData.tax_id || ""}
                        onChange={(e) => handleInputChange("tax_id", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label size="small" weight="plus">
                        Payment Terms
                      </Label>
                      <Input
                        placeholder="e.g., Net 30, COD"
                        value={formData.payment_terms || ""}
                        onChange={(e) => handleInputChange("payment_terms", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label size="small" weight="plus">
                        Currency
                      </Label>
                      <Select
                        value={formData.currency_code}
                        onValueChange={(value) => handleInputChange("currency_code", value as SupplierFormData["currency_code"])}
                      >
                        <Select.Trigger>
                          <Select.Value placeholder="Select currency" />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="EUR">EUR - Euro</Select.Item>
                          <Select.Item value="USD">USD - US Dollar</Select.Item>
                          <Select.Item value="GBP">GBP - British Pound</Select.Item>
                          <Select.Item value="CAD">CAD - Canadian Dollar</Select.Item>
                          <Select.Item value="AUD">AUD - Australian Dollar</Select.Item>
                          <Select.Item value="JPY">JPY - Japanese Yen</Select.Item>
                          <Select.Item value="CHF">CHF - Swiss Franc</Select.Item>
                          <Select.Item value="SEK">SEK - Swedish Krona</Select.Item>
                          <Select.Item value="NOK">NOK - Norwegian Krone</Select.Item>
                          <Select.Item value="DKK">DKK - Danish Krone</Select.Item>
                        </Select.Content>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
                  <Heading level="h3" className="mb-4">
                    Additional Information
                  </Heading>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label size="small" weight="plus">
                        Notes
                      </Label>
                      <Textarea
                        placeholder="Enter any additional notes..."
                        value={formData.notes || ""}
                        onChange={(e) => handleInputChange("notes", e.target.value)}
                        rows={4}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-ui-border-base">
                <Button variant="secondary" type="button" asChild>
                  <Link to={`/suppliers/${id}`}>
                    Cancel
                  </Link>
                </Button>
                <Button 
                  variant="primary" 
                  type="submit"
                  disabled={updateSupplierMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {updateSupplierMutation.isPending ? "Updating..." : "Update Supplier"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditSupplierPage

export const config = defineRouteConfig({
  label: "Edit Supplier",
}) 