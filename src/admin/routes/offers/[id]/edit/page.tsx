/**
 * TEM-282 Task 8: Edit Offer Page - REFACTORED
 *
 * Refactored to use MedusaJS best practices:
 * - Shared components from create page
 * - Customer selection via modal
 * - Native Medusa UI components
 * - Simplified form layout
 */

import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Input, Textarea, Label, DatePicker, Select, Checkbox, toast } from "@medusajs/ui"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { DocumentText } from "@medusajs/icons"
import { useCustomTranslation } from "../../../../hooks/use-custom-translation"
import { SingleColumnPageSkeleton } from "../../../../components/common/skeleton"
import { OfferCustomerSection } from "../../components/offer-customer-section"
import { Link } from "react-router-dom"

// Types (same as create page)
interface Customer {
  id: string
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  has_account: boolean
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
  offer_date: Date
  valid_until: Date | null
  currency_code: string
  billing_address: Address
  shipping_address: Address | null
  notes: string
  terms_and_conditions: string
}

// Fetch customer by ID
const useCustomer = (customerId: string | null) => {
  return useQuery({
    queryKey: ["customer", customerId],
    queryFn: async () => {
      if (!customerId) return null
      const response = await fetch(`/admin/customers/${customerId}`)
      if (!response.ok) throw new Error("Failed to fetch customer")
      const data = await response.json()
      return data.customer as Customer
    },
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * AddressForm Component (reused from create page)
 */
const AddressForm = ({
  address,
  onChange,
  required = false,
  label = "Address"
}: {
  address: Address,
  onChange: (address: Address) => void,
  required?: boolean
  label?: string
}) => {
  return (
    <div className="space-y-4">
      <Heading level="h3" className="mb-4">{label} {required && "*"}</Heading>

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
          </Select>
        </div>
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
      <AddressForm
        label="Billing Address"
        address={formData.billing_address}
        onChange={(address) => onChange({ ...formData, billing_address: address })}
        required={true}
      />

      {/* Shipping Address */}
      <div className="pt-4 border-t border-ui-border-base">
        <div className="flex items-center gap-2 mb-4">
          <Checkbox
            checked={sameAsBilling}
            onCheckedChange={handleSameAsBillingChange}
          />
          <Label size="small">Same as billing address</Label>
        </div>

        {!sameAsBilling && (
          <AddressForm
            label="Shipping Address"
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
    <div className="grid grid-cols-3 gap-4">
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
const OfferForm = ({ formData, onChange, onSubmit, loading, customer, offerId }: {
  formData: OfferFormData
  onChange: (data: OfferFormData) => void
  onSubmit: () => void
  loading: boolean
  customer: Customer | null
  offerId: string
}) => {
  const navigate = useNavigate()
  const { t } = useCustomTranslation()
  const [searchParams] = useSearchParams()

  // Check if customer ID changed via URL (from modal selection)
  const newCustomerId = searchParams.get("customer_id")

  useEffect(() => {
    if (newCustomerId && newCustomerId !== formData.customer_id) {
      onChange({ ...formData, customer_id: newCustomerId })
    }
  }, [newCustomerId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Basic validation
    if (!formData.customer_id) {
      toast.error("Please select a customer")
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

  const handleChangeCustomer = () => {
    navigate(`/offers/${offerId}/edit-customer-selection?return_to=/offers/${offerId}/edit`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-y-2">
      {/* Customer Section */}
      <OfferCustomerSection
        customer={customer}
        isEditing={true}
        onChangeCustomer={handleChangeCustomer}
      />

      {/* Offer Details */}
      <Container className="p-6">
        <Heading level="h2" className="mb-4">Offer Details</Heading>
        <DatesSection formData={formData} onChange={onChange} />
      </Container>

      {/* Address Section */}
      <Container className="p-6">
        <Heading level="h2" className="mb-4">Addresses</Heading>
        <AddressSection formData={formData} onChange={onChange} />
      </Container>

      {/* Additional Information */}
      <Container className="p-6">
        <Heading level="h2" className="mb-4">Additional Information</Heading>
        <AdditionalInfoSection formData={formData} onChange={onChange} />
      </Container>

      {/* Submit Button */}
      <Container className="p-6">
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            type="button"
            onClick={() => navigate(`/offers/${offerId}`)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Offer"}
          </Button>
        </div>
      </Container>
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

  // Fetch customer data
  const { data: customer } = useCustomer(
    formData?.customer_id || offerData?.offer?.customer_id || null
  )

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

  // Update customer data when changed
  useEffect(() => {
    if (customer && formData) {
      setFormData(prev => ({
        ...prev!,
        billing_address: customer.billing_address || prev!.billing_address,
        shipping_address: customer.shipping_address || prev!.shipping_address,
      }))
    }
  }, [customer])

  const handleSubmit = async () => {
    if (!formData) return

    setSaving(true)
    try {
      const payload = {
        customer_id: formData.customer_id,
        customer_email: customer?.email || "",
        customer_phone: customer?.phone || "",
        offer_date: formData.offer_date.toISOString(),
        valid_until: formData.valid_until?.toISOString() || null,
        currency_code: formData.currency_code,
        billing_address: formData.billing_address,
        shipping_address: formData.shipping_address,
        notes: formData.notes,
        terms_and_conditions: formData.terms_and_conditions,
      }

      const response = await fetch(`/admin/offers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
        customer={customer || null}
        offerId={id!}
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
