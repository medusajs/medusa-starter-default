import React from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Tag, Eye, PencilSquare, Trash, Plus, ArrowUturnLeft } from "@medusajs/icons"
import { 
  Container, 
  Heading, 
  Button, 
  Badge, 
  Text,
  DataTable,
  useDataTable,
  createDataTableColumnHelper,
  createDataTableFilterHelper,
  toast,
  FocusModal,
  Input,
  Textarea,
  Switch,
  Label
} from "@medusajs/ui"
import type { DataTableFilteringState } from "@medusajs/ui"
import { Link, useNavigate } from "react-router-dom"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, FormProvider, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

// Types for brand data
interface Brand {
  id: string
  name: string
  code: string
  description?: string
  country_of_origin?: string
  warranty_terms?: string
  authorized_dealer: boolean
  is_oem: boolean
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

// Form validation schema for creating brands
const createBrandSchema = z.object({
  name: z.string().min(1, "Brand name is required"),
  code: z.string().min(1, "Brand code is required").max(10, "Code must be 10 characters or less"),
  logo_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  website_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  contact_email: z.string().email("Must be a valid email").optional().or(z.literal("")),
  contact_phone: z.string().optional(),
  description: z.string().optional(),
  country_of_origin: z.string().optional(),
  warranty_terms: z.string().optional(),
  authorized_dealer: z.boolean().default(false),
  is_oem: z.boolean().default(true),
  is_active: z.boolean().default(true),
  display_order: z.number().min(0).default(0),
})

type CreateBrandFormData = z.infer<typeof createBrandSchema>

const PAGE_SIZE = 20

// Create filter helper
const filterHelper = createDataTableFilterHelper<Brand>()

// Brand filters following native Medusa pattern
const useBrandFilters = () => {
  return [
    filterHelper.accessor("is_active", {
      label: "Status",
      type: "select",
      options: [
        { label: "Active", value: "true" },
        { label: "Inactive", value: "false" },
      ],
    }),
    filterHelper.accessor("is_oem", {
      label: "Type",
      type: "select",
      options: [
        { label: "OEM", value: "true" },
        { label: "Aftermarket", value: "false" },
      ],
    }),
    filterHelper.accessor("created_at", {
      label: "Created At",
      type: "date",
      format: "date",
      options: [],
    }),
    filterHelper.accessor("updated_at", {
      label: "Updated At",
      type: "date",
      format: "date",
      options: [],
    }),
  ]
}

// Data fetching hook
const useBrands = () => {
  return useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const response = await fetch(`/admin/brands`)
      if (!response.ok) {
        throw new Error("Failed to fetch brands")
      }
      const data = await response.json()
      return {
        brands: data.brands || [],
        count: data.count || 0
      }
    },
  })
}

// Create brand mutation
const useCreateBrand = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: CreateBrandFormData) => {
      const response = await fetch("/admin/brands", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to create brand")
      }
      
      return response.json()
    },
    onSuccess: () => {
      toast.success("Brand created successfully")
      queryClient.invalidateQueries({ queryKey: ["brands"] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// Delete brand mutation
const useDeleteBrand = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/admin/brands/${id}`, {
        method: "DELETE",
      })
      
      if (!response.ok) {
        throw new Error("Failed to delete brand")
      }
      
      return response.json()
    },
    onSuccess: () => {
      toast.success("Brand deleted successfully")
      queryClient.invalidateQueries({ queryKey: ["brands"] })
    },
    onError: () => {
      toast.error("Failed to delete brand")
    },
  })
}

// Brand actions component
const BrandActions = ({ brand }: { brand: Brand }) => {
  const navigate = useNavigate()
  const deleteBrandMutation = useDeleteBrand()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (window.confirm(`Are you sure you want to delete "${brand.name}"?`)) {
      deleteBrandMutation.mutate(brand.id)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="small"
        variant="transparent"
        onClick={(e) => {
          e.stopPropagation()
          navigate(`/settings/brands/${brand.id}`)
        }}
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        size="small"
        variant="transparent"
        onClick={(e) => {
          e.stopPropagation()
          navigate(`/settings/brands/${brand.id}/edit`)
        }}
      >
        <PencilSquare className="h-4 w-4" />
      </Button>
      <Button
        size="small"
        variant="transparent"
        onClick={handleDelete}
        disabled={deleteBrandMutation.isPending}
      >
        <Trash className="h-4 w-4" />
      </Button>
    </div>
  )
}

// Create Brand Modal Component
const CreateBrandModal = () => {
  const createBrandMutation = useCreateBrand()
  
  const form = useForm<CreateBrandFormData>({
    resolver: zodResolver(createBrandSchema),
    defaultValues: {
      name: "",
      code: "",
      logo_url: "",
      website_url: "",
      contact_email: "",
      contact_phone: "",
      description: "",
      country_of_origin: "",
      warranty_terms: "",
      authorized_dealer: false,
      is_oem: true,
      is_active: true,
      display_order: 0,
    },
  })

  const watchedValues = form.watch()

  const onSubmit = (data: CreateBrandFormData) => {
    // Clean up empty string values to null for optional fields
    const cleanedData = {
      ...data,
      logo_url: data.logo_url || undefined,
      website_url: data.website_url || undefined,
      contact_email: data.contact_email || undefined,
      contact_phone: data.contact_phone || undefined,
      description: data.description || undefined,
      country_of_origin: data.country_of_origin || undefined,
      warranty_terms: data.warranty_terms || undefined,
    }
    
    createBrandMutation.mutate(cleanedData, {
      onSuccess: () => {
        form.reset()
      }
    })
  }

  return (
    <FocusModal>
      <FocusModal.Trigger asChild>
        <Button size="small" variant="secondary">
          <Plus className="h-4 w-4" />
          Create Brand
        </Button>
      </FocusModal.Trigger>
      <FocusModal.Content>
        <FocusModal.Header>
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-y-1">
              <Heading level="h1">Create Brand</Heading>
              <Text className="text-ui-fg-subtle">
                Add a new brand or manufacturer to your catalog
              </Text>
            </div>
          </div>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col items-center py-16 overflow-y-auto">
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex w-full max-w-4xl flex-col gap-y-8">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Basic Information */}
                  <div className="flex flex-col gap-y-4">
                    <Heading level="h2">Basic Information</Heading>
                    
                    <div className="grid gap-y-4">
                      <Controller
                        control={form.control}
                        name="name"
                        render={({ field, fieldState }) => (
                          <div className="flex flex-col space-y-2">
                            <Label size="small" weight="plus">
                              Brand Name *
                            </Label>
                            <Input {...field} placeholder="Caterpillar Inc." />
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
                        name="code"
                        render={({ field, fieldState }) => (
                          <div className="flex flex-col space-y-2">
                            <Label size="small" weight="plus">
                              Brand Code *
                            </Label>
                            <Input {...field} placeholder="CAT" />
                            <Text size="xsmall" className="text-ui-fg-subtle">
                              Short identifier (max 10 characters)
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
                        name="description"
                        render={({ field, fieldState }) => (
                          <div className="flex flex-col space-y-2">
                            <Label size="small">Description</Label>
                            <Textarea {...field} placeholder="Brief description of the brand..." rows={3} />
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

                  {/* Contact & Web Information */}
                  <div className="flex flex-col gap-y-4">
                    <Heading level="h2">Contact & Web</Heading>
                    
                    <div className="grid gap-y-4">
                      <Controller
                        control={form.control}
                        name="website_url"
                        render={({ field, fieldState }) => (
                          <div className="flex flex-col space-y-2">
                            <Label size="small">Website URL</Label>
                            <Input {...field} type="url" placeholder="https://www.caterpillar.com" />
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
                        name="logo_url"
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
                        name="contact_email"
                        render={({ field, fieldState }) => (
                          <div className="flex flex-col space-y-2">
                            <Label size="small">Contact Email</Label>
                            <Input {...field} type="email" placeholder="info@caterpillar.com" />
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
                        name="contact_phone"
                        render={({ field, fieldState }) => (
                          <div className="flex flex-col space-y-2">
                            <Label size="small">Contact Phone</Label>
                            <Input {...field} type="tel" placeholder="+1-555-123-4567" />
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

                  {/* Business Information */}
                  <div className="flex flex-col gap-y-4">
                    <Heading level="h2">Business Information</Heading>
                    
                    <div className="grid gap-y-4">
                      <Controller
                        control={form.control}
                        name="country_of_origin"
                        render={({ field, fieldState }) => (
                          <div className="flex flex-col space-y-2">
                            <Label size="small">Country of Origin</Label>
                            <Input {...field} placeholder="United States" />
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
                        name="warranty_terms"
                        render={({ field, fieldState }) => (
                          <div className="flex flex-col space-y-2">
                            <Label size="small">Warranty Terms</Label>
                            <Textarea {...field} placeholder="24 months standard warranty..." rows={2} />
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
                        name="display_order"
                        render={({ field, fieldState }) => (
                          <div className="flex flex-col space-y-2">
                            <Label size="small">Display Order</Label>
                            <Input {...field} type="number" min="0" placeholder="0" />
                            <Text size="xsmall" className="text-ui-fg-subtle">
                              Lower numbers appear first in lists
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

                  {/* Settings */}
                  <div className="flex flex-col gap-y-4">
                    <Heading level="h2">Settings</Heading>
                    
                    <div className="grid gap-y-4">
                      <div className="flex items-center justify-between">
                        <div className="grid gap-y-1">
                          <Label>Active Status</Label>
                          <Text size="small" className="text-ui-fg-subtle">
                            Whether this brand is active and visible
                          </Text>
                        </div>
                        <Switch
                          checked={watchedValues.is_active}
                          onCheckedChange={(checked) => form.setValue("is_active", checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="grid gap-y-1">
                          <Label>Original Equipment Manufacturer (OEM)</Label>
                          <Text size="small" className="text-ui-fg-subtle">
                            Is this brand an OEM or aftermarket supplier?
                          </Text>
                        </div>
                        <Switch
                          checked={watchedValues.is_oem}
                          onCheckedChange={(checked) => form.setValue("is_oem", checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="grid gap-y-1">
                          <Label>Authorized Dealer</Label>
                          <Text size="small" className="text-ui-fg-subtle">
                            Are you an authorized dealer for this brand?
                          </Text>
                        </div>
                        <Switch
                          checked={watchedValues.authorized_dealer}
                          onCheckedChange={(checked) => form.setValue("authorized_dealer", checked)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

              <div className="flex items-center justify-end gap-x-2 pt-6">
                <FocusModal.Close asChild>
                  <Button variant="secondary" size="small">
                    Cancel
                  </Button>
                </FocusModal.Close>
                <Button
                  type="submit"
                  size="small"
                  isLoading={createBrandMutation.isPending}
                >
                  Create Brand
                </Button>
              </div>
            </form>
          </FormProvider>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}

// Route config - No icon for settings pages
export const config = defineRouteConfig({
  label: "Brands",
})

// Brands list table component - following official DataTable pattern
const BrandsListTable = () => {
  const navigate = useNavigate()
  const { data, isLoading, error } = useBrands()
  const filters = useBrandFilters()
  
  // Filter state management
  const [search, setSearch] = React.useState("")
  const [filtering, setFiltering] = React.useState<DataTableFilteringState>({})
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  })

  if (error) {
    throw error
  }

  const brands = data?.brands || []
  const count = data?.count || 0

  // Column helper - following official pattern
  const columnHelper = createDataTableColumnHelper<Brand>()

  const columns = [
    columnHelper.accessor("name", {
      header: "Brand Name",
      enableSorting: true,
      cell: ({ getValue }) => (
        <Text className="font-medium">{getValue()}</Text>
      ),
    }),
    columnHelper.accessor("code", {
      header: "Code",
      cell: ({ getValue }) => (
        <Text className="font-mono text-xs">{getValue()}</Text>
      ),
    }),
    columnHelper.accessor("country_of_origin", {
      header: "Country",
      cell: ({ getValue }) => (
        <Text>{getValue() || "—"}</Text>
      ),
    }),
    columnHelper.accessor("is_active", {
      header: "Status",
      cell: ({ getValue }) => (
        <Badge 
          size="2xsmall"
          color={getValue() ? "green" : "red"}
        >
          {getValue() ? "Active" : "Inactive"}
        </Badge>
      ),
    }),
    columnHelper.accessor("is_oem", {
      header: "Type",
      cell: ({ getValue, row }) => {
        const brand = row.original
        if (brand.is_oem) return <Badge size="2xsmall" color="blue">OEM</Badge>
        if (brand.authorized_dealer) return <Badge size="2xsmall" color="purple">Authorized</Badge>
        return <Badge size="2xsmall" color="grey">Aftermarket</Badge>
      },
    }),
    columnHelper.accessor("description", {
      header: "Description",
      cell: ({ getValue }) => (
        <Text className="truncate max-w-xs">{getValue() || "—"}</Text>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => <BrandActions brand={row.original} />,
    }),
  ]

  const table = useDataTable({
    data: brands,
    columns,
    filters,
    rowCount: count,
    getRowId: (row) => row.id,
    search: {
      state: search,
      onSearchChange: setSearch,
    },
    filtering: {
      state: filtering,
      onFilteringChange: setFiltering,
    },
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
  })

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>Brands</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Manage your spare parts brands and manufacturers ({count} brands)
          </Text>
        </div>
        <CreateBrandModal />
      </div>
      <DataTable instance={table}>
        <DataTable.Toolbar className="flex items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-2">
            <DataTable.FilterMenu />
          </div>
          <div className="flex items-center gap-2">
            <DataTable.Search placeholder="Search brands..." />
          </div>
        </DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>
    </Container>
  )
}

// Main brands page component
const BrandsPage = () => {
  return <BrandsListTable />
}

export default BrandsPage 