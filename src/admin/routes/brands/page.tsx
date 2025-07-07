import React from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Plus, Eye, PencilSquare, Trash, Tag } from "@medusajs/icons"
import { 
  Container, 
  Heading, 
  Button, 
  Badge, 
  IconButton, 
  Text, 
  createDataTableColumnHelper,
  createDataTableFilterHelper,
  DataTable,
  DataTablePaginationState,
  DataTableFilteringState,
  DataTableSortingState,
  toast, 
  useDataTable 
} from "@medusajs/ui"
import { useSearchParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"

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

// Define columns for the table
const columnHelper = createDataTableColumnHelper<Brand>()

const columns = [
  columnHelper.accessor("code", {
    header: "Code",
    enableSorting: true,
    sortLabel: "Code",
    sortAscLabel: "A-Z",
    sortDescLabel: "Z-A",
    cell: ({ getValue }) => (
      <Text className="font-mono text-sm font-medium">{getValue()}</Text>
    ),
  }),
  columnHelper.accessor("name", {
    header: "Name",
    enableSorting: true,
    sortLabel: "Name",
    sortAscLabel: "A-Z",
    sortDescLabel: "Z-A",
    cell: ({ getValue }) => (
      <Text className="font-medium">{getValue()}</Text>
    ),
  }),
  columnHelper.accessor("country_of_origin", {
    header: "Country",
    enableSorting: true,
    sortLabel: "Country",
    cell: ({ getValue }) => (
      <Text>{getValue() || "-"}</Text>
    ),
  }),
  columnHelper.display({
    id: "type",
    header: "Type",
    cell: ({ row }) => {
      const brand = row.original
      return (
        <div className="flex gap-1">
          {brand.is_oem && (
            <Badge color="green" size="2xsmall">OEM</Badge>
          )}
          {!brand.is_oem && (
            <Badge color="orange" size="2xsmall">Aftermarket</Badge>
          )}
          {brand.authorized_dealer && (
            <Badge color="blue" size="2xsmall">Authorized</Badge>
          )}
        </div>
      )
    },
  }),
  columnHelper.accessor("is_active", {
    header: "Status",
    enableSorting: true,
    sortLabel: "Status",
    cell: ({ getValue }) => (
      <Badge 
        color={getValue() ? "green" : "red"}
        size="2xsmall"
      >
        {getValue() ? "Active" : "Inactive"}
      </Badge>
    ),
  }),
  columnHelper.display({
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <BrandActions brand={row.original} />,
  }),
]

// Define filters for the table
const filterHelper = createDataTableFilterHelper<Brand>()

const filters = [
  filterHelper.accessor("is_active", {
    type: "select",
    label: "Status",
    options: [
      {
        label: "Active",
        value: "true",
      },
      {
        label: "Inactive",
        value: "false",
      },
    ],
  }),
  filterHelper.accessor("is_oem", {
    type: "select",
    label: "Type",
    options: [
      {
        label: "OEM",
        value: "true",
      },
      {
        label: "Aftermarket", 
        value: "false",
      },
    ],
  }),
  filterHelper.accessor("authorized_dealer", {
    type: "select",
    label: "Authorization",
    options: [
      {
        label: "Authorized",
        value: "true",
      },
      {
        label: "Not Authorized",
        value: "false",
      },
    ],
  }),
]

const limit = 15

// Data fetching hook with pagination, filtering, sorting, and search
const useBrands = (
  pagination: DataTablePaginationState,
  search: string,
  filtering: DataTableFilteringState,
  sorting: DataTableSortingState | null
) => {
  const offset = useMemo(() => {
    return pagination.pageIndex * limit
  }, [pagination])

  const statusFilters = useMemo(() => {
    return (filtering.is_active || []) as string[]
  }, [filtering])

  const typeFilters = useMemo(() => {
    return (filtering.is_oem || []) as string[]
  }, [filtering])

  const authFilters = useMemo(() => {
    return (filtering.authorized_dealer || []) as string[]
  }, [filtering])

  return useQuery({
    queryKey: ["brands", limit, offset, search, statusFilters, typeFilters, authFilters, sorting?.id, sorting?.desc],
    queryFn: async () => {
      console.log("Fetching brands from API...")
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      })

      if (search) {
        params.append("search", search)
      }

      if (statusFilters.length > 0) {
        statusFilters.forEach(status => params.append("is_active", status))
      }

      if (typeFilters.length > 0) {
        typeFilters.forEach(type => params.append("is_oem", type))
      }

      if (authFilters.length > 0) {
        authFilters.forEach(auth => params.append("authorized_dealer", auth))
      }

      if (sorting) {
        const order = `${sorting.desc ? "-" : ""}${sorting.id}`
        params.append("order", order)
      }

      const response = await fetch(`/admin/brands?${params.toString()}`)
      console.log("Response status:", response.status)
      
      if (!response.ok) {
        console.error("API response not ok:", response.status, response.statusText)
        throw new Error("Failed to fetch brands")
      }
      
      const data = await response.json()
      console.log("API response data:", data)
      
      return {
        brands: data.brands || [],
        count: data.count || 0
      }
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
      queryClient.invalidateQueries({ queryKey: ["brands"] })
      toast.success("Brand deleted successfully!")
    },
    onError: (error) => {
      toast.error("Failed to delete brand. Please try again.")
      console.error("Error deleting brand:", error)
    },
  })
}

// Brand Actions Component
const BrandActions = ({ brand }: { brand: Brand }) => {
  const queryClient = useQueryClient()
  const deleteBrandMutation = useDeleteBrand()
  const navigate = useNavigate()

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!confirm(`Are you sure you want to delete ${brand.name}?`)) {
      return
    }

    try {
      await deleteBrandMutation.mutateAsync(brand.id)
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  return (
    <div className="flex items-center gap-2">
      <IconButton
        variant="transparent"
        size="small"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation()
          navigate(`/brands?id=${brand.id}`)
        }}
      >
        <Eye className="w-4 h-4" />
      </IconButton>
      <IconButton
        variant="transparent"
        size="small"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation()
          navigate(`/brands/${brand.id}/edit`)
        }}
      >
        <PencilSquare className="w-4 h-4" />
      </IconButton>
      <IconButton
        variant="transparent"
        size="small"
        onClick={handleDelete}
        disabled={deleteBrandMutation.isPending}
      >
        <Trash className="w-4 h-4" />
      </IconButton>
    </div>
  )
}

// Single brand fetch for detail view
const useBrand = (id: string) => {
  return useQuery({
    queryKey: ["brand", id],
    queryFn: async () => {
      const response = await fetch(`/admin/brands/${id}`)
      if (!response.ok) {
        throw new Error("Failed to fetch brand")
      }
      const data = await response.json()
      return data.brand
    },
    enabled: !!id,
  })
}

// Brand Detail Component
const BrandDetail = ({ brandId }: { brandId: string }) => {
  const { data: brand, isLoading, error } = useBrand(brandId)
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Text>Loading brand details...</Text>
      </div>
    )
  }

  if (error || !brand) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Text className="text-ui-fg-error">
          Failed to load brand details. Please try again.
        </Text>
      </div>
    )
  }

  return (
    <Container>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Button 
            variant="secondary" 
            size="small" 
            onClick={() => navigate("/brands")}
            className="mb-4"
          >
            ← Back to Brands
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <Heading level="h1">{brand.name}</Heading>
              <Text className="text-ui-fg-subtle">
                Code: {brand.code}
              </Text>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="secondary" 
                size="small"
                onClick={() => navigate(`/brands/${brand.id}/edit`)}
              >
                <PencilSquare className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
        </div>

        {/* Brand Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <Heading level="h2">Basic Information</Heading>
            <div className="space-y-3">
              <div>
                <Text className="text-ui-fg-subtle text-sm">Name</Text>
                <Text className="font-medium">{brand.name}</Text>
              </div>
              <div>
                <Text className="text-ui-fg-subtle text-sm">Code</Text>
                <Text className="font-mono">{brand.code}</Text>
              </div>
              <div>
                <Text className="text-ui-fg-subtle text-sm">Country of Origin</Text>
                <Text>{brand.country_of_origin || "-"}</Text>
              </div>
              <div>
                <Text className="text-ui-fg-subtle text-sm">Description</Text>
                <Text>{brand.description || "-"}</Text>
              </div>
            </div>
          </div>

          {/* Status & Type */}
          <div className="space-y-4">
            <Heading level="h2">Status & Type</Heading>
            <div className="space-y-3">
              <div>
                <Text className="text-ui-fg-subtle text-sm">Status</Text>
                <Badge 
                  color={brand.is_active ? "green" : "red"}
                  size="2xsmall"
                >
                  {brand.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div>
                <Text className="text-ui-fg-subtle text-sm">Type</Text>
                <div className="flex gap-1">
                  <Badge color={brand.is_oem ? "green" : "orange"} size="2xsmall">
                    {brand.is_oem ? "OEM" : "Aftermarket"}
                  </Badge>
                  {brand.authorized_dealer && (
                    <Badge color="blue" size="2xsmall">Authorized</Badge>
                  )}
                </div>
              </div>
              <div>
                <Text className="text-ui-fg-subtle text-sm">Display Order</Text>
                <Text>{brand.display_order}</Text>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        {brand.warranty_terms && (
          <div className="space-y-4">
            <Heading level="h2">Warranty Terms</Heading>
            <div className="bg-ui-bg-subtle rounded-lg p-4">
              <Text>{brand.warranty_terms}</Text>
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}

// Main Brands Page Component
const BrandsPage = () => {
  const [searchParams] = useSearchParams()
  const brandId = searchParams.get("id")
  
  if (brandId) {
    return <BrandDetail brandId={brandId} />
  }
  
  return <BrandsList />
}

// Brands List Component
const BrandsList = () => {
  const navigate = useNavigate()
  
  // State for pagination, search, filtering, and sorting
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageSize: limit,
    pageIndex: 0,
  })
  const [search, setSearch] = useState<string>("")
  const [filtering, setFiltering] = useState<DataTableFilteringState>({})
  const [sorting, setSorting] = useState<DataTableSortingState | null>(null)

  const { data, isLoading, error } = useBrands(pagination, search, filtering, sorting)

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Text className="text-ui-fg-error">
          Failed to load brands. Please try again.
        </Text>
      </div>
    )
  }

  const table = useDataTable({
    columns,
    data: data?.brands || [],
    getRowId: (row) => row.id,
    rowCount: data?.count || 0,
    isLoading,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
    search: {
      state: search,
      onSearchChange: setSearch,
    },
    filtering: {
      state: filtering,
      onFilteringChange: setFiltering,
    },
    filters,
    sorting: {
      state: sorting,
      onSortingChange: setSorting,
    },
    onRowClick: (row) => {
      navigate(`/brands?id=${row.original.id}`)
    },
  })

  return (
    <Container>
      <DataTable instance={table}>
        <DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
          <div>
            <Heading level="h1">Brands</Heading>
            <Text className="text-ui-fg-subtle">
              Manage your brand partners and manufacturers
            </Text>
          </div>
          <div className="flex gap-2">
            <DataTable.FilterMenu tooltip="Filter" />
            <DataTable.SortingMenu tooltip="Sort" />
            <DataTable.Search placeholder="Search brands..." />
            <Button onClick={() => navigate("/brands/create")}>
              <Plus className="w-4 h-4 mr-2" />
              Create Brand
            </Button>
          </div>
        </DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>
    </Container>
  )
}

export default BrandsPage

export const config = defineRouteConfig({
  label: "Brands",
  path: "/brands",
  icon: Tag,
}) 