/**
 * TEM-282 Task 8: Edit Offer Page
 * 
 * Edit page for existing offers. Only accessible for draft offers.
 * Pre-populates form with existing offer data.
 * 
 * Following the implementation plan from TEM-282.
 */

import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Card, Input, Textarea, Label, DatePicker, Select, Checkbox, toast } from "@medusajs/ui"
import { useNavigate, useParams } from "react-router-dom"
import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { DocumentText } from "@medusajs/icons"
import { useCustomTranslation } from "../../../../hooks/use-custom-translation"
import { SingleColumnPageSkeleton } from "../../../../components/common/skeleton"

// Types (same as create page)
interface Customer {
  id: string
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  billing_address?: Address
  shipping_address?: Address
}

interface Address {
  address_1?: string
  address_2?: string
  city?: string
  postal_code?: string
  province?: string
  country_code?: string
}

interface OfferFormData {
  customer_id: string
  customer_email: string
  customer_phone: string
  offer_date: Date
  valid_until: Date | null
  currency_code: string
  billing_address: Address
  shipping_address: Address | null
  notes: string
  terms_and_conditions: string
}

// Fetch customers for selection
const useCustomers = () => {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const response = await fetch(`/admin/customers?limit=1000`)
      if (!response.ok) throw new Error("Failed to fetch customers")
      const data = await response.json()
      return {
        customers: data.customers || [],
        count: data.count || 0
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Fetch countries for address form
const useCountries = () => {
  return useQuery({
    queryKey: ["countries"],
    queryFn: async () => {
      const response = await fetch(`/admin/regions`)
      if (!response.ok) throw new Error("Failed to fetch countries")
      const data = await response.json()
      // Extract unique countries from regions
      const countries = new Set<string>()
      data.regions?.forEach((region: any) => {
        region.countries?.forEach((country: any) => {
          countries.add(country.iso_2)
        })
      })
      return Array.from(countries)
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  })
}

/**
 * AddressForm Component (reused from create page)
 */
const AddressForm = ({ address, onChange, required = false }: { 
  address: Address, 
  onChange: (address: Address) => void,
  required?: boolean 
}) => {
  const { data: countries } = useCountries()

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label size="small" weight="plus">
          Address Line 1 {required && "*"}
        </Label>
        <Input
          value={address.address_1 || ""}
          onChange={(e) => onChange({ ...address, address_1: e.target.value })}
          placeholder="Street address"
          required={required}
        />
      </div>
      
      <div className="col-span-2">
        <Label size="small" weight="plus">
          Address Line 2
        </Label>
        <Input
          value={address.address_2 || ""}
          onChange={(e) => onChange({ ...address, address_2: e.target.value })}
          placeholder="Apartment, suite, etc."
        />
      </div>
      
      <div>
        <Label size="small" weight="plus">
          City {required && "*"}
        </Label>
        <Input
          value={address.city || ""}
          onChange={(e) => onChange({ ...address, city: e.target.value })}
          placeholder="City"
          required={required}
        />
      </div>
      
      <div>
        <Label size="small" weight="plus">
          Postal Code {required && "*"}
        </Label>
        <Input
          value={address.postal_code || ""}
          onChange={(e) => onChange({ ...address, postal_code: e.target.value })}
          placeholder="Postal code"
          required={required}
        />
      </div>
      
      <div>
        <Label size="small" weight="plus">
          Province/State
        </Label>
        <Input
          value={address.province || ""}
          onChange={(e) => onChange({ ...address, province: e.target.value })}
          placeholder="Province or state"
        />
      </div>
      
      <div>
        <Label size="small" weight="plus">
          Country {required && "*"}
        </Label>
        <Select
          value={address.country_code || ""}
          onValueChange={(value) => onChange({ ...address, country_code: value })}
          required={required}
        >
          <option value="">Select country</option>
          <option value="be">Belgium</option>
          <option value="nl">Netherlands</option>
          <option value="de">Germany</option>
          <option value="fr">France</option>
          <option value="gb">United Kingdom</option>
          <option value="us">United States</option>
          {countries?.map((code) => (
            <option key={code} value={code}>
              {code.toUpperCase()}
            </option>
          ))}
        </Select>
      </div>
    </div>
  )
}

/**
 * AddressSection Component (reused from create page)
 */
const AddressSection = ({ formData, onChange }: { 
  formData: OfferFormData, 
  onChange: (data: OfferFormData) => void 
}) => {
  const [sameAsBilling, setSameAsBilling] = useState(!formData.shipping_address)
  
  const handleSameAsBillingChange = (checked: boolean) => {
    setSameAsBilling(checked)
    if (checked) {
      onChange({ ...formData, shipping_address: null })
    } else {
      onChange({ ...formData, shipping_address: {} })
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Billing Address */}
      <div>
        <Heading level="h3" className="mb-4">Billing Address *</Heading>
        <AddressForm
          address={formData.billing_address}
          onChange={(address) => onChange({ ...formData, billing_address: address })}
          required={true}
        />
      </div>
      
      {/* Shipping Address */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Heading level="h3">Shipping Address</Heading>
          <Checkbox
            checked={sameAsBilling}
            onCheckedChange={handleSameAsBillingChange}
          />
          <Label size="small">Same as billing</Label>
        </div>
        
        {!sameAsBilling && (
          <AddressForm
            address={formData.shipping_address || {}}
            onChange={(address) => onChange({ ...formData, shipping_address: address })}
          />
        )}
      </div>
    </div>
  )
}

/**
 * DatesSection Component (reused from create page)
 */
const DatesSection = ({ formData, onChange }: { 
  formData: OfferFormData, 
  onChange: (data: OfferFormData) => void 
}) => {
  const handleOfferDateChange = (date: Date | undefined) => {
    if (!date) return
    
    // Auto-calculate valid_until (30 days from offer_date)
    const validUntil = new Date(date)
    validUntil.setDate(validUntil.getDate() + 30)
    
    onChange({
      ...formData,
      offer_date: date,
      valid_until: validUntil,
    })
  }
  
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label size="small" weight="plus">
          Offer Date *
        </Label>
        <DatePicker
          value={formData.offer_date}
          onChange={handleOfferDateChange}
          required
        />
      </div>
      
      <div>
        <Label size="small" weight="plus">
          Valid Until *
        </Label>
        <DatePicker
          value={formData.valid_until || undefined}
          onChange={(date) => onChange({ ...formData, valid_until: date || null })}
          minDate={formData.offer_date}
          required
        />
      </div>
      
      <div>
        <Label size="small" weight="plus">
          Currency
        </Label>
        <Select
          value={formData.currency_code}
          onValueChange={(value) => onChange({ ...formData, currency_code: value })}
        >
          <option value="EUR">EUR (€)</option>
          <option value="USD">USD ($)</option>
          <option value="GBP">GBP (£)</option>
        </Select>
      </div>
    </div>
  )
}

/**
 * CustomerSection Component (reused from create page)
 */
const CustomerSection = ({ formData, onChange }: { 
  formData: OfferFormData, 
  onChange: (data: OfferFormData) => void 
}) => {
  const { data: customersData } = useCustomers()
  const customers = customersData?.customers || []
  
  const handleCustomerSelect = async (customerId: string) => {
    if (!customerId) return
    
    try {
      // Fetch customer details
      const response = await fetch(`/admin/customers/${customerId}`)
      if (!response.ok) throw new Error("Failed to fetch customer details")
      const data = await response.json()
      const customer = data.customer
      
      onChange({
        ...formData,
        customer_id: customerId,
        customer_email: customer.email || "",
        customer_phone: customer.phone || "",
        billing_address: customer.billing_address || {},
        shipping_address: customer.shipping_address || null,
      })
    } catch (error) {
      console.error("Error fetching customer:", error)
      toast.error("Failed to load customer details")
    }
  }
  
  return (
    <div className="space-y-4">
      <div>
        <Label size="small" weight="plus">
          Customer *
        </Label>
        <Select
          value={formData.customer_id}
          onValueChange={handleCustomerSelect}
          required
        >
          <option value="">Select a customer...</option>
          {customers.map((customer: Customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.email} {customer.first_name && `(${customer.first_name} ${customer.last_name})`}
            </option>
          ))}
        </Select>
      </div>
      
      <div>
        <Label size="small" weight="plus">
          Email *
        </Label>
        <Input
          type="email"
          value={formData.customer_email}
          onChange={(e) => onChange({ ...formData, customer_email: e.target.value })}
          required
        />
      </div>
      
      <div>
        <Label size="small" weight="plus">
          Phone
        </Label>
        <Input
          type="tel"
          value={formData.customer_phone}
          onChange={(e) => onChange({ ...formData, customer_phone: e.target.value })}
        />
      </div>
    </div>
  )
}

/**
 * AdditionalInfoSection Component (reused from create page)
 */
const AdditionalInfoSection = ({ formData, onChange }: { 
  formData: OfferFormData, 
  onChange: (data: OfferFormData) => void 
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label size="small" weight="plus">
          Notes
        </Label>
        <Textarea
          placeholder="Add any notes for the customer..."
          value={formData.notes}
          onChange={(e) => onChange({ ...formData, notes: e.target.value })}
          rows={4}
        />
      </div>
      
      <div>
        <Label size="small" weight="plus">
          Terms and Conditions
        </Label>
        <Textarea
          placeholder="Enter terms and conditions..."
          value={formData.terms_and_conditions}
          onChange={(e) => onChange({ ...formData, terms_and_conditions: e.target.value })}
          rows={6}
        />
      </div>
    </div>
  )
}

/**
 * OfferForm Component (reused from create page with isEditing flag)
 */
const OfferForm = ({ formData, onChange, onSubmit, loading, isEditing = false }: {
  formData: OfferFormData
  onChange: (data: OfferFormData) => void
  onSubmit: () => void
  loading: boolean
  isEditing?: boolean
}) => {
  const navigate = useNavigate()
  const { t } = useCustomTranslation()
  const { id } = useParams()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    if (!formData.customer_id) {
      toast.error("Please select a customer")
      return
    }
    
    if (!formData.customer_email) {
      toast.error("Customer email is required")
      return
    }
    
    if (!formData.billing_address.address_1 || !formData.billing_address.city || 
        !formData.billing_address.postal_code || !formData.billing_address.country_code) {
      toast.error("Please complete the billing address")
      return
    }
    
    if (formData.valid_until && formData.valid_until <= formData.offer_date) {
      toast.error("Valid until date must be after offer date")
      return
    }
    
    onSubmit()
  }

  const backUrl = isEditing ? `/offers/${id}` : "/offers"

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {/* Customer Section */}
        <Card>
          <Card.Header>
            <Heading level="h2">Customer Information</Heading>
          </Card.Header>
          <Card.Body>
            <CustomerSection formData={formData} onChange={onChange} />
          </Card.Body>
        </Card>
        
        {/* Dates Section */}
        <Card>
          <Card.Header>
            <Heading level="h2">Offer Details</Heading>
          </Card.Header>
          <Card.Body>
            <DatesSection formData={formData} onChange={onChange} />
          </Card.Body>
        </Card>
        
        {/* Address Section */}
        <Card>
          <Card.Header>
            <Heading level="h2">Addresses</Heading>
          </Card.Header>
          <Card.Body>
            <AddressSection formData={formData} onChange={onChange} />
          </Card.Body>
        </Card>
        
        {/* Additional Information */}
        <Card>
          <Card.Header>
            <Heading level="h2">Additional Information</Heading>
          </Card.Header>
          <Card.Body>
            <AdditionalInfoSection formData={formData} onChange={onChange} />
          </Card.Body>
        </Card>
        
        {/* Submit Button */}
        <div className="flex justify-end gap-2">
          <Button 
            variant="secondary" 
            type="button"
            onClick={() => navigate(backUrl)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Offer"}
          </Button>
        </div>
      </div>
    </form>
  )
}

/**
 * TEM-282 Task 8: Edit Offer Page
 * 
 * Main page component for editing offers.
 * Only accessible for draft offers.
 */
const EditOfferPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useCustomTranslation()
  
  const [formData, setFormData] = useState<OfferFormData | null>(null)
  const [saving, setSaving] = useState(false)
  
  // Fetch offer data
  const { data: offerData, isLoading, error } = useQuery({
    queryKey: ["offer", id],
    queryFn: async () => {
      const response = await fetch(`/admin/offers/${id}`)
      if (!response.ok) throw new Error("Failed to fetch offer")
      return response.json()
    },
    enabled: !!id,
  })
  
  // Populate form when offer data is loaded
  useEffect(() => {
    if (offerData?.offer) {
      const offer = offerData.offer
      
      // Check if offer is editable (only draft offers can be edited)
      if (offer.status !== "draft") {
        toast.error("Only draft offers can be edited")
        navigate(`/offers/${id}`)
        return
      }
      
      setFormData({
        customer_id: offer.customer_id || "",
        customer_email: offer.customer_email || "",
        customer_phone: offer.customer_phone || "",
        offer_date: new Date(offer.offer_date),
        valid_until: offer.valid_until ? new Date(offer.valid_until) : null,
        currency_code: offer.currency_code || "EUR",
        billing_address: offer.billing_address || {},
        shipping_address: offer.shipping_address || null,
        notes: offer.notes || "",
        terms_and_conditions: offer.terms_and_conditions || "",
      })
    }
  }, [offerData, navigate, id])
  
  const handleSubmit = async () => {
    if (!formData) return
    
    setSaving(true)
    try {
      const response = await fetch(`/admin/offers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          offer_date: formData.offer_date.toISOString(),
          valid_until: formData.valid_until?.toISOString() || null,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || errorData.details || "Failed to update offer")
      }
      
      toast.success("Offer updated successfully")
      navigate(`/offers/${id}`)
    } catch (error: any) {
      console.error("Failed to update offer:", error)
      toast.error("Failed to update offer", {
        description: error.message
      })
    } finally {
      setSaving(false)
    }
  }
  
  if (isLoading || !formData) {
    return <SingleColumnPageSkeleton sections={4} showJSON={false} showMetadata={false} />
  }
  
  if (error) {
    throw error
  }
  
  return (
    <Container>
      <div className="mb-6">
        <Button variant="secondary" onClick={() => navigate(`/offers/${id}`)}>
          ← Back to Offer
        </Button>
        <Heading level="h1" className="mt-2">Edit Offer</Heading>
      </div>
      
      <OfferForm
        formData={formData}
        onChange={setFormData}
        onSubmit={handleSubmit}
        loading={saving}
        isEditing
      />
    </Container>
  )
}

export default EditOfferPage

export const config = defineRouteConfig({
  label: "Edit Offer",
  icon: DocumentText,
})

export const handle = {
  breadcrumb: () => "Edit Offer",
}

