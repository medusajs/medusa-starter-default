import React, { useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { 
  Container, 
  Heading, 
  Button, 
  Text,
  Input,
  Textarea,
  Label,
  Switch,
  Select,
  toast
} from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, FormProvider, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { DocumentText, Eye, ArrowUturnLeft } from "@medusajs/icons"
import { sdk } from "../../../lib/sdk"

// Types for invoice settings
interface InvoiceSettings {
  company: {
    name: string
    address: {
      street: string
      city: string
      postal_code: string
      country: string
    }
    contact: {
      email: string
      phone: string
      website?: string
    }
    legal: {
      vat_number: string
      registration_number?: string
      bank_account?: string
    }
  }
  template: {
    header_color: string
    logo_url?: string
    footer_text?: string
    show_payment_terms: boolean
    show_due_date: boolean
    currency_format: string
    date_format: string
  }
  defaults: {
    payment_terms: string
    due_days: number
    tax_rate: number
    currency_code: string
  }
}

// Form validation schema
const invoiceSettingsSchema = z.object({
  company: z.object({
    name: z.string().min(1, "Company name is required"),
    address: z.object({
      street: z.string().min(1, "Street address is required"),
      city: z.string().min(1, "City is required"),
      postal_code: z.string().min(1, "Postal code is required"),
      country: z.string().min(1, "Country is required"),
    }),
    contact: z.object({
      email: z.string().email("Valid email is required"),
      phone: z.string().min(1, "Phone number is required"),
      website: z.string().url("Must be a valid URL").nullish().or(z.literal("")),
    }),
    legal: z.object({
      vat_number: z.string().min(1, "VAT number is required"),
      registration_number: z.string().nullish(),
      bank_account: z.string().nullish(),
    }),
  }),
  template: z.object({
    header_color: z.string().min(1, "Header color is required"),
    logo_url: z.string().url("Must be a valid URL").nullish().or(z.literal("")),
    footer_text: z.string().nullish(),
    show_payment_terms: z.boolean(),
    show_due_date: z.boolean(),
    currency_format: z.string().min(1, "Currency format is required"),
    date_format: z.string().min(1, "Date format is required"),
  }),
  defaults: z.object({
    payment_terms: z.string().min(1, "Payment terms are required"),
    due_days: z.number().min(1, "Due days must be at least 1"),
    tax_rate: z.number().min(0).max(1, "Tax rate must be between 0 and 1"),
    currency_code: z.string().min(1, "Currency code is required"),
  }),
})

type InvoiceSettingsFormData = z.infer<typeof invoiceSettingsSchema>

// Data fetching hook
const useInvoiceSettings = () => {
  return useQuery({
    queryKey: ["invoice-settings"],
    queryFn: async () => {
      const response = await sdk.client.fetch<{ settings: InvoiceSettings }>("/admin/invoice-settings")
      return response.settings
    },
  })
}

// Update settings mutation
const useUpdateInvoiceSettings = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (settings: InvoiceSettings) => {
      const response = await sdk.client.fetch<{ settings: InvoiceSettings }>("/admin/invoice-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: { settings },
      })
      
      return response.settings
    },
    onSuccess: () => {
      toast.success("Invoice settings updated successfully")
      queryClient.invalidateQueries({ queryKey: ["invoice-settings"] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// Company Information Section Component
const CompanyInformationSection = ({ form }: { form: any }) => {
  return (
    <Container className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading level="h2">Company Information</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Configure your company details that will appear on invoices
          </Text>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <div className="flex flex-col gap-y-4">
          <Heading level="h3">Basic Information</Heading>
          
          <div className="grid gap-y-4">
            <Controller
              control={form.control}
              name="company.name"
              render={({ field, fieldState }) => (
                <div className="flex flex-col space-y-2">
                  <Label size="small" weight="plus">
                    Company Name *
                  </Label>
                  <Input {...field} placeholder="Your Company Name" />
                  {fieldState.error && (
                    <span className="text-red-500 text-sm">
                      {fieldState.error.message}
                    </span>
                  )}
                </div>
              )}
            />

            <Controller
              control={form.control}
              name="company.contact.email"
              render={({ field, fieldState }) => (
                <div className="flex flex-col space-y-2">
                  <Label size="small" weight="plus">
                    Email *
                  </Label>
                  <Input {...field} type="email" placeholder="info@yourcompany.com" />
                  {fieldState.error && (
                    <span className="text-red-500 text-sm">
                      {fieldState.error.message}
                    </span>
                  )}
                </div>
              )}
            />

            <Controller
              control={form.control}
              name="company.contact.phone"
              render={({ field, fieldState }) => (
                <div className="flex flex-col space-y-2">
                  <Label size="small" weight="plus">
                    Phone *
                  </Label>
                  <Input {...field} type="tel" placeholder="+32 123 456 789" />
                  {fieldState.error && (
                    <span className="text-red-500 text-sm">
                      {fieldState.error.message}
                    </span>
                  )}
                </div>
              )}
            />

            <Controller
              control={form.control}
              name="company.contact.website"
              render={({ field, fieldState }) => (
                <div className="flex flex-col space-y-2">
                  <Label size="small">Website</Label>
                  <Input {...field} type="url" placeholder="https://www.yourcompany.com" />
                  {fieldState.error && (
                    <span className="text-red-500 text-sm">
                      {fieldState.error.message}
                    </span>
                  )}
                </div>
              )}
            />
          </div>
        </div>

        {/* Address Information */}
        <div className="flex flex-col gap-y-4">
          <Heading level="h3">Address</Heading>
          
          <div className="grid gap-y-4">
            <Controller
              control={form.control}
              name="company.address.street"
              render={({ field, fieldState }) => (
                <div className="flex flex-col space-y-2">
                  <Label size="small" weight="plus">
                    Street Address *
                  </Label>
                  <Input {...field} placeholder="123 Main Street" />
                  {fieldState.error && (
                    <span className="text-red-500 text-sm">
                      {fieldState.error.message}
                    </span>
                  )}
                </div>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <Controller
                control={form.control}
                name="company.address.postal_code"
                render={({ field, fieldState }) => (
                  <div className="flex flex-col space-y-2">
                    <Label size="small" weight="plus">
                      Postal Code *
                    </Label>
                    <Input {...field} placeholder="1000" />
                    {fieldState.error && (
                      <span className="text-red-500 text-sm">
                        {fieldState.error.message}
                      </span>
                    )}
                  </div>
                )}
              />

              <Controller
                control={form.control}
                name="company.address.city"
                render={({ field, fieldState }) => (
                  <div className="flex flex-col space-y-2">
                    <Label size="small" weight="plus">
                      City *
                    </Label>
                    <Input {...field} placeholder="Brussels" />
                    {fieldState.error && (
                      <span className="text-red-500 text-sm">
                        {fieldState.error.message}
                      </span>
                    )}
                  </div>
                )}
              />
            </div>

            <Controller
              control={form.control}
              name="company.address.country"
              render={({ field, fieldState }) => (
                <div className="flex flex-col space-y-2">
                  <Label size="small" weight="plus">
                    Country *
                  </Label>
                  <Input {...field} placeholder="Belgium" />
                  {fieldState.error && (
                    <span className="text-red-500 text-sm">
                      {fieldState.error.message}
                    </span>
                  )}
                </div>
              )}
            />
          </div>
        </div>

        {/* Legal Information */}
        <div className="flex flex-col gap-y-4 md:col-span-2">
          <Heading level="h3">Legal Information</Heading>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Controller
              control={form.control}
              name="company.legal.vat_number"
              render={({ field, fieldState }) => (
                <div className="flex flex-col space-y-2">
                  <Label size="small" weight="plus">
                    VAT Number *
                  </Label>
                  <Input {...field} placeholder="BE0123456789" />
                  {fieldState.error && (
                    <span className="text-red-500 text-sm">
                      {fieldState.error.message}
                    </span>
                  )}
                </div>
              )}
            />

            <Controller
              control={form.control}
              name="company.legal.registration_number"
              render={({ field, fieldState }) => (
                <div className="flex flex-col space-y-2">
                  <Label size="small">Registration Number</Label>
                  <Input {...field} placeholder="0123456789" />
                  {fieldState.error && (
                    <span className="text-red-500 text-sm">
                      {fieldState.error.message}
                    </span>
                  )}
                </div>
              )}
            />

            <Controller
              control={form.control}
              name="company.legal.bank_account"
              render={({ field, fieldState }) => (
                <div className="flex flex-col space-y-2">
                  <Label size="small">Bank Account</Label>
                  <Input {...field} placeholder="BE68 5390 0754 7034" />
                  {fieldState.error && (
                    <span className="text-red-500 text-sm">
                      {fieldState.error.message}
                    </span>
                  )}
                </div>
              )}
            />
          </div>
        </div>
      </div>
    </Container>
  )
}

// Template Configuration Section Component
const TemplateConfigurationSection = ({ form }: { form: any }) => {
  return (
    <Container className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading level="h2">Template Configuration</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Customize the appearance and behavior of your invoices
          </Text>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Visual Settings */}
        <div className="flex flex-col gap-y-4">
          <Heading level="h3">Visual Settings</Heading>
          
          <div className="grid gap-y-4">
            <Controller
              control={form.control}
              name="template.header_color"
              render={({ field, fieldState }) => (
                <div className="flex flex-col space-y-2">
                  <Label size="small" weight="plus">
                    Header Color *
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input {...field} placeholder="#2c5530" />
                    <div 
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: field.value || "#2c5530" }}
                    />
                  </div>
                  {fieldState.error && (
                    <span className="text-red-500 text-sm">
                      {fieldState.error.message}
                    </span>
                  )}
                </div>
              )}
            />

            <Controller
              control={form.control}
              name="template.logo_url"
              render={({ field, fieldState }) => (
                <div className="flex flex-col space-y-2">
                  <Label size="small">Logo URL</Label>
                  <Input {...field} type="url" placeholder="https://example.com/logo.png" />
                  {fieldState.error && (
                    <span className="text-red-500 text-sm">
                      {fieldState.error.message}
                    </span>
                  )}
                </div>
              )}
            />

            <Controller
              control={form.control}
              name="template.footer_text"
              render={({ field, fieldState }) => (
                <div className="flex flex-col space-y-2">
                  <Label size="small">Footer Text</Label>
                  <Textarea {...field} placeholder="Thank you for your business!" rows={3} />
                  {fieldState.error && (
                    <span className="text-red-500 text-sm">
                      {fieldState.error.message}
                    </span>
                  )}
                </div>
              )}
            />
          </div>
        </div>

        {/* Display Settings */}
        <div className="flex flex-col gap-y-4">
          <Heading level="h3">Display Settings</Heading>
          
          <div className="grid gap-y-4">
            <div className="flex items-center justify-between">
              <div className="grid gap-y-1">
                <Label>Show Payment Terms</Label>
                <Text size="small" className="text-ui-fg-subtle">
                  Display payment terms on invoices
                </Text>
              </div>
              <Switch
                checked={form.watch("template.show_payment_terms") || false}
                onCheckedChange={(checked) => form.setValue("template.show_payment_terms", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="grid gap-y-1">
                <Label>Show Due Date</Label>
                <Text size="small" className="text-ui-fg-subtle">
                  Display due date prominently on invoices
                </Text>
              </div>
              <Switch
                checked={form.watch("template.show_due_date") || false}
                onCheckedChange={(checked) => form.setValue("template.show_due_date", checked)}
              />
            </div>

            <Controller
              control={form.control}
              name="template.currency_format"
              render={({ field, fieldState }) => (
                <div className="flex flex-col space-y-2">
                  <Label size="small" weight="plus">
                    Currency Format *
                  </Label>
                  <Select {...field}>
                    <Select.Trigger>
                      <Select.Value placeholder="Select currency format" />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="nl-BE">Belgium (€1.234,56)</Select.Item>
                      <Select.Item value="en-US">US ($1,234.56)</Select.Item>
                      <Select.Item value="en-GB">UK (£1,234.56)</Select.Item>
                      <Select.Item value="de-DE">Germany (1.234,56 €)</Select.Item>
                      <Select.Item value="fr-FR">France (1 234,56 €)</Select.Item>
                    </Select.Content>
                  </Select>
                  {fieldState.error && (
                    <span className="text-red-500 text-sm">
                      {fieldState.error.message}
                    </span>
                  )}
                </div>
              )}
            />

            <Controller
              control={form.control}
              name="template.date_format"
              render={({ field, fieldState }) => (
                <div className="flex flex-col space-y-2">
                  <Label size="small" weight="plus">
                    Date Format *
                  </Label>
                  <Select {...field}>
                    <Select.Trigger>
                      <Select.Value placeholder="Select date format" />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="dd/MM/yyyy">DD/MM/YYYY (European)</Select.Item>
                      <Select.Item value="MM/dd/yyyy">MM/DD/YYYY (US)</Select.Item>
                      <Select.Item value="yyyy-MM-dd">YYYY-MM-DD (ISO)</Select.Item>
                      <Select.Item value="dd-MM-yyyy">DD-MM-YYYY</Select.Item>
                    </Select.Content>
                  </Select>
                  {fieldState.error && (
                    <span className="text-red-500 text-sm">
                      {fieldState.error.message}
                    </span>
                  )}
                </div>
              )}
            />
          </div>
        </div>
      </div>
    </Container>
  )
}

// Default Settings Section Component
const DefaultSettingsSection = ({ form }: { form: any }) => {
  return (
    <Container className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading level="h2">Default Settings</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Configure default values for new invoices
          </Text>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Payment Settings */}
        <div className="flex flex-col gap-y-4">
          <Heading level="h3">Payment Settings</Heading>
          
          <div className="grid gap-y-4">
            <Controller
              control={form.control}
              name="defaults.payment_terms"
              render={({ field, fieldState }) => (
                <div className="flex flex-col space-y-2">
                  <Label size="small" weight="plus">
                    Payment Terms *
                  </Label>
                  <Textarea {...field} placeholder="Payment due within 30 days" rows={2} />
                  {fieldState.error && (
                    <span className="text-red-500 text-sm">
                      {fieldState.error.message}
                    </span>
                  )}
                </div>
              )}
            />

            <Controller
              control={form.control}
              name="defaults.due_days"
              render={({ field, fieldState }) => (
                <div className="flex flex-col space-y-2">
                  <Label size="small" weight="plus">
                    Due Days *
                  </Label>
                  <Input 
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const value = e.target.value === "" ? 1 : parseInt(e.target.value, 10)
                      field.onChange(value)
                    }}
                    type="number" 
                    min="1" 
                    placeholder="30" 
                  />
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    Number of days after invoice date when payment is due
                  </Text>
                  {fieldState.error && (
                    <span className="text-red-500 text-sm">
                      {fieldState.error.message}
                    </span>
                  )}
                </div>
              )}
            />

            <Controller
              control={form.control}
              name="defaults.currency_code"
              render={({ field, fieldState }) => (
                <div className="flex flex-col space-y-2">
                  <Label size="small" weight="plus">
                    Currency Code *
                  </Label>
                  <Select {...field}>
                    <Select.Trigger>
                      <Select.Value placeholder="Select currency" />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="EUR">EUR (Euro)</Select.Item>
                      <Select.Item value="USD">USD (US Dollar)</Select.Item>
                      <Select.Item value="GBP">GBP (British Pound)</Select.Item>
                      <Select.Item value="CHF">CHF (Swiss Franc)</Select.Item>
                    </Select.Content>
                  </Select>
                  {fieldState.error && (
                    <span className="text-red-500 text-sm">
                      {fieldState.error.message}
                    </span>
                  )}
                </div>
              )}
            />
          </div>
        </div>

        {/* Tax Settings */}
        <div className="flex flex-col gap-y-4">
          <Heading level="h3">Tax Settings</Heading>
          
          <div className="grid gap-y-4">
            <Controller
              control={form.control}
              name="defaults.tax_rate"
              render={({ field, fieldState }) => (
                <div className="flex flex-col space-y-2">
                  <Label size="small" weight="plus">
                    Default Tax Rate *
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const value = e.target.value === "" ? 0 : parseFloat(e.target.value)
                        field.onChange(value)
                      }}
                      type="number" 
                      min="0" 
                      max="1" 
                      step="0.01"
                      placeholder="0.21" 
                    />
                    <Text size="small" className="text-ui-fg-subtle">
                      ({((field.value || 0) * 100).toFixed(1)}%)
                    </Text>
                  </div>
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    Default VAT rate for Belgium is 21%
                  </Text>
                  {fieldState.error && (
                    <span className="text-red-500 text-sm">
                      {fieldState.error.message}
                    </span>
                  )}
                </div>
              )}
            />
          </div>
        </div>
      </div>
    </Container>
  )
}

// Main Invoice Settings Page Component
const InvoiceSettingsPage = () => {
  const { data: settings, isLoading, error } = useInvoiceSettings()
  const updateSettingsMutation = useUpdateInvoiceSettings()
  const [isPreviewMode, setIsPreviewMode] = useState(false)

  const form = useForm<InvoiceSettingsFormData>({
    resolver: zodResolver(invoiceSettingsSchema),
    defaultValues: {
      company: {
        name: "",
        address: {
          street: "",
          city: "",
          postal_code: "",
          country: "",
        },
        contact: {
          email: "",
          phone: "",
          website: "",
        },
        legal: {
          vat_number: "",
          registration_number: "",
          bank_account: "",
        },
      },
      template: {
        header_color: "#2c5530",
        logo_url: "",
        footer_text: "",
        show_payment_terms: true,
        show_due_date: true,
        currency_format: "nl-BE",
        date_format: "dd/MM/yyyy",
      },
      defaults: {
        payment_terms: "Payment due within 30 days",
        due_days: 30,
        tax_rate: 0.21,
        currency_code: "EUR",
      },
    },
  })

  // Update form when settings are loaded
  React.useEffect(() => {
    if (settings) {
      form.reset(settings)
    }
  }, [settings, form])

  const onSubmit = (data: InvoiceSettingsFormData) => {
    // Clean up empty string values
    const cleanedData = {
      ...data,
      company: {
        ...data.company,
        contact: {
          ...data.company.contact,
          website: data.company.contact.website || undefined,
        },
        legal: {
          ...data.company.legal,
          registration_number: data.company.legal.registration_number || undefined,
          bank_account: data.company.legal.bank_account || undefined,
        },
      },
      template: {
        ...data.template,
        logo_url: data.template.logo_url || undefined,
        footer_text: data.template.footer_text || undefined,
      },
    }

    updateSettingsMutation.mutate(cleanedData)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-y-2">
        <Container className="p-6">
          <Heading level="h1">Invoice Settings</Heading>
        </Container>
        <Container className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </Container>
      </div>
    )
  }

  if (error) {
    throw error
  }

  return (
    <div className="flex flex-col gap-y-2">
      <Container className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <Heading level="h1">Invoice Settings</Heading>
            <Text className="text-ui-fg-subtle" size="small">
              Configure your company information and invoice templates
            </Text>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="small"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
            >
              <Eye className="h-4 w-4" />
              {isPreviewMode ? "Edit" : "Preview"}
            </Button>
            <Button
              variant="secondary"
              size="small"
              onClick={() => form.reset(settings)}
              disabled={updateSettingsMutation.isPending}
            >
              <ArrowUturnLeft className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>
      </Container>

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-y-2">
          <CompanyInformationSection form={form} />
          <TemplateConfigurationSection form={form} />
          <DefaultSettingsSection form={form} />

          <Container className="p-6">
            <div className="flex items-center justify-end gap-x-2">
              <Button
                type="submit"
                size="small"
                isLoading={updateSettingsMutation.isPending}
              >
                <DocumentText className="h-4 w-4" />
                Save Settings
              </Button>
            </div>
          </Container>
        </form>
      </FormProvider>
    </div>
  )
}

export default InvoiceSettingsPage

// Route config
export const config = defineRouteConfig({
  label: "Invoice Settings",
})
