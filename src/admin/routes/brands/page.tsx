import React, { useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Plus, Eye, PencilSquare, Trash, MagnifyingGlass } from "@medusajs/icons"
import { 
  Container, 
  Heading, 
  Button, 
  Table, 
  Badge, 
  IconButton, 
  Text, 
  Input,
  Select,
  createDataTableColumnHelper, 
  DataTable, 
  toast, 
  useDataTable 
} from "@medusajs/ui"
import { Link, useSearchParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

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

// Fetch brands function
const fetchBrands = async (params: any) => {
  const searchParams = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.append(key, String(value))
    }
  })
  
  const response = await fetch(`/admin/brands?${searchParams.toString()}`)
  if (!response.ok) {
    throw new Error('Failed to fetch brands')
  }
  return response.json()
}

// Delete brand function
const deleteBrand = async (id: string) => {
  const response = await fetch(`/admin/brands/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error('Failed to delete brand')
  }
}

// Column helper for type-safe table columns
const columnHelper = createDataTableColumnHelper<Brand>()

// Brand actions component
const BrandActions = ({ brand }: { brand: Brand }) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const deleteMutation = useMutation({
    mutationFn: deleteBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] })
      toast.success(`Brand ${brand.name} deleted successfully`)
    },
    onError: (error: any) => {
      toast.error(`Failed to delete brand: ${error.message}`)
    },
  })
  
  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${brand.name}?`)) {
      deleteMutation.mutate(brand.id)
    }
  }
  
  return (
    <div className="flex items-center gap-2">
      <IconButton
        onClick={() => navigate(`/brands/${brand.id}`)}
        variant="transparent"
        size="small"
      >
        <Eye />
      </IconButton>
      <IconButton
        onClick={() => navigate(`/brands/${brand.id}/edit`)}
        variant="transparent"
        size="small"
      >
        <PencilSquare />
      </IconButton>
      <IconButton
        onClick={handleDelete}
        variant="transparent"
        size="small"
        className="text-red-500 hover:text-red-700"
      >
        <Trash />
      </IconButton>
    </div>
  )
}

// Table column definitions
const columns = [
  columnHelper.accessor("code", {
    header: "Code",
    enableSorting: true,
    sortLabel: "Code",
    cell: ({ getValue }) => (
      <Text className="font-mono text-sm font-medium">{getValue()}</Text>
    ),
  }),
  columnHelper.accessor("name", {
    header: "Name",
    enableSorting: true,
    sortLabel: "Name",
    cell: ({ getValue }) => (
      <Text className="font-medium">{getValue()}</Text>
    ),
  }),
  columnHelper.accessor("country_of_origin", {
    header: "Country",
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
            <Badge variant="green" size="small">OEM</Badge>
          )}
          {!brand.is_oem && (
            <Badge variant="orange" size="small">Aftermarket</Badge>
          )}
          {brand.authorized_dealer && (
            <Badge variant="blue" size="small">Authorized</Badge>
          )}
        </div>
      )
    },
  }),
  columnHelper.accessor("is_active", {
    header: "Status",
    cell: ({ getValue }) => (
      <Badge 
        variant={getValue() ? "green" : "red"}
        size="small"
      >
        {getValue() ? "Active" : "Inactive"}
      </Badge>
    ),
  }),
  columnHelper.display({
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const brand = row.original
      return <BrandActions brand={brand} />
    },
  }),
]

// Main brands page component
const BrandsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    is_active: searchParams.get('is_active') || '',
    is_oem: searchParams.get('is_oem') || '',
    authorized_dealer: searchParams.get('authorized_dealer') || '',
  })
  
  const queryParams = {
    limit: 50,
    offset: 0,
    ...filters,
  }
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['brands', queryParams],
    queryFn: () => fetchBrands(queryParams),
  })
  
  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    
    // Update URL params
    const newSearchParams = new URLSearchParams()
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) newSearchParams.set(k, v)
    })
    setSearchParams(newSearchParams)
  }
  
  const clearFilters = () => {
    setFilters({
      search: '',
      is_active: '',
      is_oem: '',
      authorized_dealer: '',
    })
    setSearchParams({})
  }
  
  if (error) {
    return (
      <Container>
        <Text className="text-red-500">Error loading brands: {error.message}</Text>
      </Container>
    )
  }
  
  return (
    <Container>
      <div className="flex items-center justify-between mb-6">
        <Heading level="h1">Brands</Heading>
        <Link to="/brands/create">
          <Button>
            <Plus className="mr-2" />
            Create Brand
          </Button>
        </Link>
      </div>
      
      {/* Filters */}
      <div className="mb-6 p-4 border rounded-lg bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Text className="text-sm font-medium mb-1">Search</Text>
            <Input
              placeholder="Search brands..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          <div>
            <Text className="text-sm font-medium mb-1">Status</Text>
            <Select
              value={filters.is_active}
              onValueChange={(value) => handleFilterChange('is_active', value)}
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </div>
          <div>
            <Text className="text-sm font-medium mb-1">Type</Text>
            <Select
              value={filters.is_oem}
              onValueChange={(value) => handleFilterChange('is_oem', value)}
            >
              <option value="">All</option>
              <option value="true">OEM</option>
              <option value="false">Aftermarket</option>
            </Select>
          </div>
          <div>
            <Text className="text-sm font-medium mb-1">Authorization</Text>
            <Select
              value={filters.authorized_dealer}
              onValueChange={(value) => handleFilterChange('authorized_dealer', value)}
            >
              <option value="">All</option>
              <option value="true">Authorized</option>
              <option value="false">Not Authorized</option>
            </Select>
          </div>
        </div>
        <div className="mt-3">
          <Button variant="secondary" size="small" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      </div>
      
      {/* Data Table */}
      {isLoading ? (
        <Text>Loading brands...</Text>
      ) : (
        <DataTable
          columns={columns}
          data={data?.brands || []}
          pageSize={50}
          count={data?.count || 0}
        />
      )}
    </Container>
  )
}

// Route configuration
export const config = defineRouteConfig({
  label: "Brands",
  icon: Badge,
})

export default BrandsPage 