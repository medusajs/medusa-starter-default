/**
 * TEM-282: Create Offer Form Page - SIMPLIFIED UX
 *
 * Simplified UX flow following Medusa best practices:
 * 1. Select customer (auto-populates address + currency)
 * 2. Add products/line items
 * 3. Create offer
 *
 * No manual address editing - uses customer data directly
 */

import { Container, Heading, Button, Textarea, Label, DatePicker, toast } from "@medusajs/ui"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useCustomTranslation } from "../../../hooks/use-custom-translation"
import { OfferCustomerSection } from "../components/offer-customer-section"
import { sdk } from "../../../lib/sdk"
import { HttpTypes } from "@medusajs/types"

// Simplified form data - no manual address/currency editing
interface OfferFormData {
  customer_id: string
  offer_date: Date
  valid_until: Date | null
  notes: string
  terms_and_conditions: string
}

// Fetch customer by ID using Medusa SDK
const useCustomer = (customerId: string | null) => {
  return useQuery({
    queryKey: ["customer", customerId],
    queryFn: async () => {
      if (!customerId) return null

      // Retrieve customer with addresses relation
      const { customer } = await sdk.admin.customer.retrieve(customerId, {
        fields: "*addresses", // Use * prefix to include the addresses relation
      })

      return customer as HttpTypes.AdminCustomer
    },
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * DatesSection Component - Simple date selection
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
    </div>
  )
}

/**
 * AdditionalInfoSection Component
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
 * OfferForm Component - Simplified main form
 */
const OfferForm = ({
  formData,
  onChange,
  onSubmit,
  loading,
  customer
}: {
  formData: OfferFormData
  onChange: (data: OfferFormData) => void
  onSubmit: () => void
  loading: boolean
  customer: HttpTypes.AdminCustomer | null
}) => {
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.customer_id) {
      toast.error("Please select a customer")
      return
    }

    if (formData.valid_until && formData.valid_until <= formData.offer_date) {
      toast.error("Valid until date must be after offer date")
      return
    }

    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-y-2">
      {/* Customer Section */}
      <OfferCustomerSection
        customer={customer}
        isEditing={false}
      />

      {/* Offer Details */}
      <Container className="p-6">
        <Heading level="h2" className="mb-4">Offer Details</Heading>
        <DatesSection formData={formData} onChange={onChange} />
      </Container>

      {/* Additional Information */}
      <Container className="p-6">
        <Heading level="h2" className="mb-4">Additional Information</Heading>
        <AdditionalInfoSection formData={formData} onChange={onChange} />
      </Container>

      {/* Submit Button */}
      <Container className="p-6">
        <div className="flex justify-between items-center gap-2">
          <div className="text-sm text-ui-fg-subtle">
            Add line items after creating the offer
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => navigate("/offers")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                !formData.customer_id ||
                !customer?.addresses ||
                customer.addresses.length === 0
              }
            >
              {loading ? "Creating..." : "Create Offer"}
            </Button>
          </div>
        </div>
      </Container>
    </form>
  )
}

/**
 * Create Offer Page - Main component
 */
const CreateOfferPage = () => {
  const navigate = useNavigate()
  const { t } = useCustomTranslation()
  const [searchParams] = useSearchParams()

  const customerIdFromUrl = searchParams.get("customer_id")

  const [formData, setFormData] = useState<OfferFormData>({
    customer_id: customerIdFromUrl || "",
    offer_date: new Date(),
    valid_until: null,
    notes: "",
    terms_and_conditions: "",
  })
  const [loading, setLoading] = useState(false)

  // Fetch customer if ID is in URL
  const { data: customer } = useCustomer(customerIdFromUrl)

  // Auto-populate customer ID when customer is loaded
  useEffect(() => {
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customer_id: customer.id,
      }))
    }
  }, [customer])

  // Auto-calculate valid_until on mount (30 days from today)
  useEffect(() => {
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + 30)
    setFormData(prev => ({ ...prev, valid_until: validUntil }))
  }, [])

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Validate customer has at least one address
      if (!customer?.addresses || customer.addresses.length === 0) {
        toast.error("Customer must have at least one address", {
          description: "Please add an address to the customer before creating an offer"
        })
        setLoading(false)
        return
      }

      // Get addresses from customer
      const billingAddress = customer.addresses[0]
      const shippingAddress = customer.addresses[1] || customer.addresses[0]

      // Default currency to EUR if not determinable
      const currencyCode = "EUR" // TODO: Derive from region when customer regions are implemented

      // Prepare payload - auto-populate from customer data
      const payload = {
        customer_id: formData.customer_id,
        customer_email: customer.email || "",
        customer_phone: customer.phone || "",
        offer_date: formData.offer_date.toISOString(),
        valid_until: formData.valid_until?.toISOString() || null,
        currency_code: currencyCode,
        billing_address: billingAddress,
        shipping_address: shippingAddress,
        notes: formData.notes,
        terms_and_conditions: formData.terms_and_conditions,
      }

      const response = await fetch("/admin/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || errorData.details || "Failed to create offer")
      }

      const data = await response.json()
      toast.success("Offer created successfully")
      // Navigate to offer detail page where line items can be added
      navigate(`/offers/${data.offer.id}`)
    } catch (error: any) {
      console.error("Failed to create offer:", error)
      toast.error("Failed to create offer", {
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container>
      <div className="mb-6">
        <Button variant="secondary" onClick={() => navigate("/offers")}>
          ← Back to Offers
        </Button>
        <Heading level="h1" className="mt-2">Create Offer</Heading>
      </div>

      <OfferForm
        formData={formData}
        onChange={setFormData}
        onSubmit={handleSubmit}
        loading={loading}
        customer={customer || null}
      />
    </Container>
  )
}

export default CreateOfferPage

// Note: No config export - create pages should not appear in navigation
// Access via "Create Offer" button from /offers list page
export const handle = {
  breadcrumb: () => "Create Offer",
}
