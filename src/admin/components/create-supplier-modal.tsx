import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import {
  Button,
  FocusModal,
  Heading,
  Input,
  Label,
  Select,
  Textarea,
  Text,
  toast,
  Badge,
} from "@medusajs/ui"
import { Plus } from "@medusajs/icons"

// Validation schema
const createSupplierSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name is too long"),
  code: z.string().max(50, "Code is too long").nullable().optional(),
  email: z.string().email("A valid email is required").nullable().optional().or(z.literal('')),
  phone: z.string().max(50, "Phone number is too long").nullable().optional(),
  website: z.string().url("Must be a valid URL").nullable().optional().or(z.literal('')),
  contact_person: z.string().max(255, "Contact person name is too long").nullable().optional(),
  address_line_1: z.string().max(255, "Address is too long").nullable().optional(),
  address_line_2: z.string().max(255, "Address is too long").nullable().optional(),
  city: z.string().max(100, "City name is too long").nullable().optional(),
  state: z.string().max(100, "State name is too long").nullable().optional(),
  postal_code: z.string().max(20, "Postal code is too long").nullable().optional(),
  country: z.string().max(100, "Country name is too long").nullable().optional(),
  tax_id: z.string().max(100, "Tax ID is too long").nullable().optional(),
  payment_terms: z.string().max(100, "Payment terms are too long").nullable().optional(),
  currency_code: z.enum(["EUR", "USD", "GBP", "CAD", "AUD", "JPY", "CHF", "SEK", "NOK", "DKK"]).default("EUR"),
  is_active: z.boolean().default(true),
  notes: z.string().max(2000, "Notes are too long").nullable().optional(),
})

type CreateSupplierFormData = z.infer<typeof createSupplierSchema>

interface CreateSupplierModalProps {
  onSuccess?: () => void
}

export const CreateSupplierModal = ({ onSuccess }: CreateSupplierModalProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<CreateSupplierFormData>({
    resolver: zodResolver(createSupplierSchema),
    defaultValues: {
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
    },
  })

  const createSupplierMutation = useMutation({
    mutationFn: async (data: CreateSupplierFormData) => {
      const response = await fetch("/admin/suppliers", {
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
        throw new Error(error.details || "Failed to create supplier")
      }
      
      return response.json()
    },
    onSuccess: () => {
      toast.success("Supplier created successfully!")
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
      form.reset()
      setIsOpen(false)
      onSuccess?.()
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create supplier")
    },
  })

  const handleSubmit = form.handleSubmit((data) => {
    createSupplierMutation.mutate(data)
  })

  return (
    <FocusModal open={isOpen} onOpenChange={setIsOpen}>
      <FocusModal.Trigger asChild>
        <Button size="small" variant="secondary">
          <Plus className="h-4 w-4" />
          Create Supplier
        </Button>
      </FocusModal.Trigger>
      
      <FocusModal.Content>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <FocusModal.Header>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-ui-bg-component rounded-lg">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <Heading level="h1">Create Supplier</Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  Add a new supplier to your database
                </Text>
              </div>
            </div>
          </FocusModal.Header>
          
          <FocusModal.Body className="flex flex-1 flex-col overflow-hidden">
            <div className="flex flex-1 flex-col overflow-y-auto">
              <div className="grid grid-cols-1 gap-8 p-6">
                
                {/* Basic Information */}
                <div className="border border-ui-border-base rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Heading level="h3">Basic Information</Heading>
                    <Badge size="2xsmall">Required</Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Controller
                      control={form.control}
                      name="name"
                      render={({ field, fieldState }) => (
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            Supplier Name *
                          </Label>
                          <Input
                            {...field}
                            placeholder="e.g., ABC Manufacturing Ltd."
                          />
                          {fieldState.error && (
                            <Text size="xsmall" className="text-red-500">
                              {fieldState.error.message}
                            </Text>
                          )}
                          <Text size="xsmall" className="text-ui-fg-subtle">
                            The official company name
                          </Text>
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="code"
                      render={({ field, fieldState }) => (
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            Supplier Code
                          </Label>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="e.g., SUP001"
                          />
                          {fieldState.error && (
                            <Text size="xsmall" className="text-red-500">
                              {fieldState.error.message}
                            </Text>
                          )}
                          <Text size="xsmall" className="text-ui-fg-subtle">
                            Unique identifier for the supplier
                          </Text>
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="email"
                      render={({ field, fieldState }) => (
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            Email Address
                          </Label>
                          <Input
                            type="email"
                            {...field}
                            value={field.value || ""}
                            placeholder="e.g., contact@abcmfg.com"
                          />
                          {fieldState.error && (
                            <Text size="xsmall" className="text-red-500">
                              {fieldState.error.message}
                            </Text>
                          )}
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="phone"
                      render={({ field, fieldState }) => (
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            Phone Number
                          </Label>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="e.g., +32 2 123 4567"
                          />
                          {fieldState.error && (
                            <Text size="xsmall" className="text-red-500">
                              {fieldState.error.message}
                            </Text>
                          )}
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="website"
                      render={({ field, fieldState }) => (
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            Website
                          </Label>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="e.g., https://www.abcmfg.com"
                          />
                          {fieldState.error && (
                            <Text size="xsmall" className="text-red-500">
                              {fieldState.error.message}
                            </Text>
                          )}
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="contact_person"
                      render={({ field, fieldState }) => (
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            Contact Person
                          </Label>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="e.g., John Smith"
                          />
                          {fieldState.error && (
                            <Text size="xsmall" className="text-red-500">
                              {fieldState.error.message}
                            </Text>
                          )}
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="currency_code"
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            Currency
                          </Label>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <Select.Trigger>
                              <Select.Value />
                            </Select.Trigger>
                            <Select.Content>
                              <Select.Item value="EUR">EUR (Euro)</Select.Item>
                              <Select.Item value="USD">USD (US Dollar)</Select.Item>
                              <Select.Item value="GBP">GBP (British Pound)</Select.Item>
                              <Select.Item value="CAD">CAD (Canadian Dollar)</Select.Item>
                              <Select.Item value="AUD">AUD (Australian Dollar)</Select.Item>
                              <Select.Item value="JPY">JPY (Japanese Yen)</Select.Item>
                              <Select.Item value="CHF">CHF (Swiss Franc)</Select.Item>
                              <Select.Item value="SEK">SEK (Swedish Krona)</Select.Item>
                              <Select.Item value="NOK">NOK (Norwegian Krone)</Select.Item>
                              <Select.Item value="DKK">DKK (Danish Krone)</Select.Item>
                            </Select.Content>
                          </Select>
                        </div>
                      )}
                    />
                  </div>
                </div>

                {/* Address Information */}
                <div className="border border-ui-border-base rounded-lg p-6">
                  <Heading level="h3" className="mb-4">Address Information</Heading>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Controller
                      control={form.control}
                      name="address_line_1"
                      render={({ field, fieldState }) => (
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            Address Line 1
                          </Label>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="e.g., 123 Industrial Street"
                          />
                          {fieldState.error && (
                            <Text size="xsmall" className="text-red-500">
                              {fieldState.error.message}
                            </Text>
                          )}
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="address_line_2"
                      render={({ field, fieldState }) => (
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            Address Line 2
                          </Label>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="e.g., Building A, Floor 2"
                          />
                          {fieldState.error && (
                            <Text size="xsmall" className="text-red-500">
                              {fieldState.error.message}
                            </Text>
                          )}
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="city"
                      render={({ field, fieldState }) => (
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            City
                          </Label>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="e.g., Brussels"
                          />
                          {fieldState.error && (
                            <Text size="xsmall" className="text-red-500">
                              {fieldState.error.message}
                            </Text>
                          )}
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="state"
                      render={({ field, fieldState }) => (
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            State/Province
                          </Label>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="e.g., Brussels-Capital Region"
                          />
                          {fieldState.error && (
                            <Text size="xsmall" className="text-red-500">
                              {fieldState.error.message}
                            </Text>
                          )}
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="postal_code"
                      render={({ field, fieldState }) => (
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            Postal Code
                          </Label>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="e.g., 1000"
                          />
                          {fieldState.error && (
                            <Text size="xsmall" className="text-red-500">
                              {fieldState.error.message}
                            </Text>
                          )}
                        </div>
                      )}
                    />
                    
                    <Controller
                      control={form.control}
                      name="country"
                      render={({ field, fieldState }) => (
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            Country
                          </Label>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="e.g., Belgium"
                          />
                          {fieldState.error && (
                            <Text size="xsmall" className="text-red-500">
                              {fieldState.error.message}
                            </Text>
                          )}
                        </div>
                      )}
                    />
                  </div>
                </div>

                {/* Business Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Financial Information */}
                  <div className="border border-ui-border-base rounded-lg p-6">
                    <Heading level="h3" className="mb-4">Financial Information</Heading>
                    
                    <div className="space-y-4">
                      <Controller
                        control={form.control}
                        name="tax_id"
                        render={({ field, fieldState }) => (
                          <div className="space-y-2">
                            <Label size="small" weight="plus">
                              Tax ID / VAT Number
                            </Label>
                            <Input
                              {...field}
                              value={field.value || ""}
                              placeholder="e.g., BE0123456789"
                            />
                            {fieldState.error && (
                              <Text size="xsmall" className="text-red-500">
                                {fieldState.error.message}
                              </Text>
                            )}
                          </div>
                        )}
                      />
                      
                      <Controller
                        control={form.control}
                        name="payment_terms"
                        render={({ field, fieldState }) => (
                          <div className="space-y-2">
                            <Label size="small" weight="plus">
                              Payment Terms
                            </Label>
                            <Input
                              {...field}
                              value={field.value || ""}
                              placeholder="e.g., Net 30, COD, 2/10 Net 30"
                            />
                            {fieldState.error && (
                              <Text size="xsmall" className="text-red-500">
                                {fieldState.error.message}
                              </Text>
                            )}
                            <Text size="xsmall" className="text-ui-fg-subtle">
                              Standard payment terms for this supplier
                            </Text>
                          </div>
                        )}
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div className="border border-ui-border-base rounded-lg p-6">
                    <Heading level="h3" className="mb-4">Status</Heading>
                    
                    <Controller
                      control={form.control}
                      name="is_active"
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            Active Status
                          </Label>
                          <Select value={field.value ? "true" : "false"} onValueChange={(value) => field.onChange(value === "true")}>
                            <Select.Trigger>
                              <Select.Value />
                            </Select.Trigger>
                            <Select.Content>
                              <Select.Item value="true">Active</Select.Item>
                              <Select.Item value="false">Inactive</Select.Item>
                            </Select.Content>
                          </Select>
                          <Text size="xsmall" className="text-ui-fg-subtle">
                            Inactive suppliers won't appear in purchase order creation
                          </Text>
                        </div>
                      )}
                    />
                  </div>
                </div>

                {/* Additional Information */}
                <div className="border border-ui-border-base rounded-lg p-6">
                  <Heading level="h3" className="mb-4">Additional Information</Heading>
                  
                  <div className="space-y-4">
                    <Controller
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Label size="small" weight="plus">
                            Notes
                          </Label>
                          <Textarea
                            {...field}
                            value={field.value || ""}
                            placeholder="Any additional notes about this supplier, special requirements, or important information..."
                            rows={4}
                          />
                          <Text size="xsmall" className="text-ui-fg-subtle">
                            Internal notes for reference
                          </Text>
                        </div>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
          </FocusModal.Body>
          
          <FocusModal.Footer>
            <div className="flex items-center justify-end gap-2">
              <FocusModal.Close asChild>
                <Button variant="secondary" size="small">
                  Cancel
                </Button>
              </FocusModal.Close>
              <Button 
                type="submit" 
                size="small"
                disabled={createSupplierMutation.isPending}
                isLoading={createSupplierMutation.isPending}
              >
                Create Supplier
              </Button>
            </div>
          </FocusModal.Footer>
        </form>
      </FocusModal.Content>
    </FocusModal>
  )
} 