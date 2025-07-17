import { Container, Badge, Text, Heading, Button, Input, Textarea, Select, Label, FocusModal } from "@medusajs/ui"
import { PencilSquare, Trash } from "@medusajs/icons"
import { useState } from "react"
import { useForm, FormProvider, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as zod from "zod"

const schema = zod.object({
  name: zod.string().min(1, "Name is required"),
  email: zod.string().email("Invalid email").optional().or(zod.literal("")),
  phone: zod.string().optional(),
  website: zod.string().optional(),
  address: zod.string().optional(),
  city: zod.string().optional(),
  state: zod.string().optional(),
  zip: zod.string().optional(),
  country: zod.string().optional(),
  tax_id: zod.string().optional(),
  payment_terms: zod.string().optional(),
  currency_code: zod.string().default("USD"),
  is_active: zod.boolean().default(true),
  notes: zod.string().optional(),
})

type FormData = zod.infer<typeof schema>

type SupplierDetailsWidgetProps = {
  supplier: {
    id: string
    name: string
    code: string
    email?: string
    phone?: string
    website?: string
    address?: string
    city?: string
    state?: string
    zip?: string
    country?: string
    tax_id?: string
    payment_terms?: string
    currency_code?: string
    is_active: boolean
    notes?: string
    created_at: string
    updated_at: string
  }
  onUpdate: (data: any) => void
  onDelete: () => void
}

const SupplierDetailsWidget = ({ supplier, onUpdate, onDelete }: SupplierDetailsWidgetProps) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: supplier.name,
      email: supplier.email || "",
      phone: supplier.phone || "",
      website: supplier.website || "",
      address: supplier.address || "",
      city: supplier.city || "",
      state: supplier.state || "",
      zip: supplier.zip || "",
      country: supplier.country || "",
      tax_id: supplier.tax_id || "",
      payment_terms: supplier.payment_terms || "",
      currency_code: supplier.currency_code || "USD",
      is_active: supplier.is_active,
      notes: supplier.notes || ""
    }
  })

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await onUpdate(data)
      setIsEditModalOpen(false)
    } catch (error) {
      console.error("Error updating supplier:", error)
    }
  })

  return (
    <Container className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Heading level="h2">Supplier Details</Heading>
          <Badge variant={supplier.is_active ? "green" : "red"}>
            {supplier.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="small" onClick={() => setIsEditModalOpen(true)}>
            <PencilSquare />
            Edit
          </Button>
          <Button variant="danger" size="small" onClick={onDelete}>
            <Trash />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Text className="text-sm font-medium text-gray-600 mb-1">Name</Text>
          <Text className="text-sm">{supplier.name}</Text>
        </div>
        
        <div>
          <Text className="text-sm font-medium text-gray-600 mb-1">Code</Text>
          <Text className="text-sm font-mono">{supplier.code}</Text>
        </div>
        
        {supplier.email && (
          <div>
            <Text className="text-sm font-medium text-gray-600 mb-1">Email</Text>
            <Text className="text-sm">{supplier.email}</Text>
          </div>
        )}
        
        {supplier.phone && (
          <div>
            <Text className="text-sm font-medium text-gray-600 mb-1">Phone</Text>
            <Text className="text-sm">{supplier.phone}</Text>
          </div>
        )}
        
        {supplier.website && (
          <div>
            <Text className="text-sm font-medium text-gray-600 mb-1">Website</Text>
            <Text className="text-sm">{supplier.website}</Text>
          </div>
        )}
        
        {supplier.address && (
          <div>
            <Text className="text-sm font-medium text-gray-600 mb-1">Address</Text>
            <Text className="text-sm">
              {supplier.address}
              {supplier.city && `, ${supplier.city}`}
              {supplier.state && `, ${supplier.state}`}
              {supplier.zip && ` ${supplier.zip}`}
              {supplier.country && `, ${supplier.country}`}
            </Text>
          </div>
        )}
        
        {supplier.tax_id && (
          <div>
            <Text className="text-sm font-medium text-gray-600 mb-1">Tax ID</Text>
            <Text className="text-sm">{supplier.tax_id}</Text>
          </div>
        )}
        
        {supplier.payment_terms && (
          <div>
            <Text className="text-sm font-medium text-gray-600 mb-1">Payment Terms</Text>
            <Text className="text-sm">{supplier.payment_terms}</Text>
          </div>
        )}
        
        <div>
          <Text className="text-sm font-medium text-gray-600 mb-1">Currency</Text>
          <Text className="text-sm">{supplier.currency_code}</Text>
        </div>
        
        {supplier.notes && (
          <div className="md:col-span-2">
            <Text className="text-sm font-medium text-gray-600 mb-1">Notes</Text>
            <Text className="text-sm">{supplier.notes}</Text>
          </div>
        )}
        
        <div>
          <Text className="text-sm font-medium text-gray-600 mb-1">Created</Text>
          <Text className="text-sm">{new Date(supplier.created_at).toLocaleDateString()}</Text>
        </div>
        
        <div>
          <Text className="text-sm font-medium text-gray-600 mb-1">Updated</Text>
          <Text className="text-sm">{new Date(supplier.updated_at).toLocaleDateString()}</Text>
        </div>
      </div>

      {/* Edit Modal */}
      <FocusModal open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <FocusModal.Content>
          <FocusModal.Header>
            <Heading level="h2">Edit Supplier Details</Heading>
          </FocusModal.Header>
          <FocusModal.Body>
            <FormProvider {...form}>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Name *</Label>
                    <Controller
                      name="name"
                      control={form.control}
                      render={({ field }) => <Input {...field} />}
                    />
                  </div>
                  
                  <div>
                    <Label>Email</Label>
                    <Controller
                      name="email"
                      control={form.control}
                      render={({ field }) => <Input {...field} type="email" />}
                    />
                  </div>
                  
                  <div>
                    <Label>Phone</Label>
                    <Controller
                      name="phone"
                      control={form.control}
                      render={({ field }) => <Input {...field} />}
                    />
                  </div>
                  
                  <div>
                    <Label>Website</Label>
                    <Controller
                      name="website"
                      control={form.control}
                      render={({ field }) => <Input {...field} />}
                    />
                  </div>
                  
                  <div>
                    <Label>Address</Label>
                    <Controller
                      name="address"
                      control={form.control}
                      render={({ field }) => <Input {...field} />}
                    />
                  </div>
                  
                  <div>
                    <Label>City</Label>
                    <Controller
                      name="city"
                      control={form.control}
                      render={({ field }) => <Input {...field} />}
                    />
                  </div>
                  
                  <div>
                    <Label>State</Label>
                    <Controller
                      name="state"
                      control={form.control}
                      render={({ field }) => <Input {...field} />}
                    />
                  </div>
                  
                  <div>
                    <Label>ZIP Code</Label>
                    <Controller
                      name="zip"
                      control={form.control}
                      render={({ field }) => <Input {...field} />}
                    />
                  </div>
                  
                  <div>
                    <Label>Country</Label>
                    <Controller
                      name="country"
                      control={form.control}
                      render={({ field }) => <Input {...field} />}
                    />
                  </div>
                  
                  <div>
                    <Label>Tax ID</Label>
                    <Controller
                      name="tax_id"
                      control={form.control}
                      render={({ field }) => <Input {...field} />}
                    />
                  </div>
                  
                  <div>
                    <Label>Payment Terms</Label>
                    <Controller
                      name="payment_terms"
                      control={form.control}
                      render={({ field }) => <Input {...field} />}
                    />
                  </div>
                  
                  <div>
                    <Label>Currency</Label>
                    <Controller
                      name="currency_code"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <Select.Trigger>
                            <Select.Value />
                          </Select.Trigger>
                          <Select.Content>
                            <Select.Item value="USD">USD</Select.Item>
                            <Select.Item value="EUR">EUR</Select.Item>
                            <Select.Item value="GBP">GBP</Select.Item>
                          </Select.Content>
                        </Select>
                      )}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label>Notes</Label>
                    <Controller
                      name="notes"
                      control={form.control}
                      render={({ field }) => <Textarea {...field} rows={3} />}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <div className="flex items-center gap-2">
                      <Controller
                        name="is_active"
                        control={form.control}
                        render={({ field }) => (
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      />
                      <Text>Active Supplier</Text>
                    </div>
                  </div>
                </div>
              </form>
            </FormProvider>
          </FocusModal.Body>
          <FocusModal.Footer>
            <div className="flex gap-2">
              <FocusModal.Close asChild>
                <Button variant="secondary">Cancel</Button>
              </FocusModal.Close>
              <Button variant="primary" onClick={handleSubmit}>
                Save Changes
              </Button>
            </div>
          </FocusModal.Footer>
        </FocusModal.Content>
      </FocusModal>
    </Container>
  )
}

export default SupplierDetailsWidget