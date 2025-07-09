import React from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Tag, Eye, PencilSquare, Trash } from "@medusajs/icons"
import { 
  Container, 
  Heading, 
  Button, 
  Badge, 
  IconButton, 
  Text,
  DataTable,
  useDataTable,
  createDataTableColumnHelper,
  toast
} from "@medusajs/ui"
import { Link, useNavigate } from "react-router-dom"
import { useState } from "react"
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

const PAGE_SIZE = 20

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
    <div className="flex items-center gap-1">
      <IconButton
        size="small"
        variant="transparent"
        onClick={(e) => {
          e.stopPropagation()
          navigate(`/brands/${brand.id}`)
        }}
      >
        <Eye className="h-4 w-4" />
      </IconButton>
      <IconButton
        size="small"
        variant="transparent"
        onClick={(e) => {
          e.stopPropagation()
          navigate(`/brands/${brand.id}/edit`)
        }}
      >
        <PencilSquare className="h-4 w-4" />
      </IconButton>
      <IconButton
        size="small"
        variant="transparent"
        onClick={handleDelete}
        disabled={deleteBrandMutation.isPending}
      >
        <Trash className="h-4 w-4" />
      </IconButton>
    </div>
  )
}

// Route config
export const config = defineRouteConfig({
  label: "Brands",
  icon: Tag,
})

// Brands list table component - following official DataTable pattern
const BrandsListTable = () => {
  const navigate = useNavigate()
  const { data, isLoading, error } = useBrands()
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
    columnHelper.accessor("country_of_origin", {
      header: "Country",
      cell: ({ getValue }) => (
        <Text>{getValue() || "—"}</Text>
      ),
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
    getRowId: (row) => row.id,
    rowCount: count,
    isLoading,
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
            Manage your spare parts brands and manufacturers
          </Text>
        </div>
        <Button size="small" variant="secondary" asChild>
          <Link to="create">Create Brand</Link>
        </Button>
      </div>
      <DataTable instance={table}>
        <DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
          <div className="flex gap-2">
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