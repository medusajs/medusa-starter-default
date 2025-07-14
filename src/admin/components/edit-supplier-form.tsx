import * as zod from "zod"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Drawer,
  Heading,
  Label,
  Input,
  Button,
  Text,
  Select,
  Textarea,
  Badge,
} from "@medusajs/ui"
import { FormProvider } from "react-hook-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "@medusajs/ui"
import { Supplier } from "../routes/purchasing/suppliers/page"

const schema = zod.object({
  name: zod.string().min(1, "Name is required").max(255, "Name is too long"),
  code: zod.string().max(50, "Code is too long").nullable().optional(),
  email: zod.string().email("A valid email is required").nullable().optional().or(zod.literal('')),
  phone: zod.string().max(50, "Phone number is too long").nullable().optional(),
  website: zod.string().url("Must be a valid URL").nullable().optional().or(zod.literal('')),
  contact_person: zod.string().max(255, "Contact person name is too long").nullable().optional(),
  address_line_1: zod.string().max(255, "Address is too long").nullable().optional(),
  address_line_2: zod.string().max(255, "Address is too long").nullable().optional(),
  city: zod.string().max(100, "City name is too long").nullable().optional(),
  state: zod.string().max(100, "State name is too long").nullable().optional(),
  postal_code: zod.string().max(20, "Postal code is too long").nullable().optional(),
  country: zod.string().max(100, "Country name is too long").nullable().optional(),
  tax_id: zod.string().max(100, "Tax ID is too long").nullable().optional(),
  payment_terms: zod.string().max(100, "Payment terms are too long").nullable().optional(),
  currency_code: zod.enum(["EUR", "USD", "GBP", "CAD", "AUD", "JPY", "CHF", "SEK", "NOK", "DKK"]).default("EUR"),
  is_active: zod.boolean().default(true),
  notes: zod.string().max(2000, "Notes are too long").nullable().optional(),
})

type FormData = zod.infer<typeof schema>

type EditSupplierFormProps = {
  supplier: Supplier
  trigger: React.ReactNode
}

export const EditSupplierForm = ({ supplier, trigger }: EditSupplierFormProps) => {
  const queryClient = useQueryClient()
  
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: supplier.name,
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
      currency_code: (supplier.currency_code as "EUR" | "USD" | "GBP" | "CAD" | "AUD" | "JPY" | "CHF" | "SEK" | "NOK" | "DKK") || "EUR",
      is_active: supplier.is_active ?? true,
      notes: supplier.notes || "",
    },
  })

  const updateSupplierMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch(`/admin/suppliers/${supplier.id}`, {
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
    onSuccess: () => {
      toast.success("Supplier updated successfully!")
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update supplier. Please try again.")
      console.error("Error updating supplier:", error)
    },
  })

  const handleSubmit = form.handleSubmit((data) => {
    updateSupplierMutation.mutate(data)
  })

  return (
    <Drawer>
      <Drawer.Trigger asChild>
        {trigger}
      </Drawer.Trigger>
      <Drawer.Content>
        <FormProvider {...form}>
          <form
            onSubmit={handleSubmit}
            className="flex h-full flex-col overflow-hidden"
          >
            <Drawer.Header>
              <Drawer.Title>
                Edit Supplier
              </Drawer.Title>
              <Drawer.Description>
                Update supplier information
              </Drawer.Description>
            </Drawer.Header>
            <Drawer.Body>
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
            </Drawer.Body>
            <Drawer.Footer>
              <div className="flex items-center justify-end gap-2">
                <Drawer.Close asChild>
                  <Button variant="secondary" size="small">
                    Cancel
                  </Button>
                </Drawer.Close>
                <Button 
                  type="submit"
                  size="small"
                  disabled={updateSupplierMutation.isPending}
                  isLoading={updateSupplierMutation.isPending}
                >
                  {updateSupplierMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </Drawer.Footer>
          </form>
        </FormProvider>
      </Drawer.Content>
    </Drawer>
  )
} 