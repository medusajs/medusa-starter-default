import { useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { 
  Container, 
  Heading, 
  Button, 
  Badge,
  DataTable,
  useDataTable,
  createDataTableColumnHelper,
  createDataTableFilterHelper,
  Text,
  DataTableFilteringState
} from "@medusajs/ui"
import { Plus, Eye, PencilSquare, Users, DocumentText } from "@medusajs/icons"
import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "react-router-dom"
import { CreateSupplierModal } from "../../components/create-supplier-modal"
import { EditSupplierForm } from "../../components/edit-supplier-form"

export interface Supplier {
  id: string
  name: string
  code?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  contact_person?: string | null
  address_line_1?: string | null
  address_line_2?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  country?: string | null
  tax_id?: string | null
  payment_terms?: string | null
  currency_code?: string
  is_active: boolean
  notes?: string | null
  metadata?: Record<string, any> | null
  purchase_orders_count?: number
  last_order_date?: Date
  created_at: Date
  updated_at?: string
}

const useSuppliers = () => {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const response = await fetch("/admin/suppliers?include_stats=true")
      if (!response.ok) throw new Error("Failed to fetch suppliers")
      return response.json()
    },
  })
}

const SuppliersPage = () => {
  const navigate = useNavigate()
  const { data, isLoading, error } = useSuppliers()
  
  const [search, setSearch] = useState("")
  const [filtering, setFiltering] = useState<DataTableFilteringState>({})
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  })

  if (error) {
    throw error
  }

  const suppliers = data?.suppliers || []
  const count = data?.count || 0

  const columnHelper = createDataTableColumnHelper<Supplier>()
  const filterHelper = createDataTableFilterHelper<Supplier>()

  const filters = [
    filterHelper.accessor("is_active", {
      label: "Status",
      type: "select",
      options: [
        { label: "Active", value: "true" },
        { label: "Inactive", value: "false" },
      ],
    }),
  ]

  const columns = [
    columnHelper.accessor("name", {
      header: "Supplier",
      enableSorting: true,
      cell: ({ getValue, row }) => (
        <div>
          <Link 
            to={`/suppliers/${row.original.id}`}
            className="txt-compact-medium-plus hover:text-ui-fg-base transition-colors"
          >
            {getValue()}
          </Link>
          {row.original.code && (
            <Text size="small" className="text-ui-fg-subtle">
              {row.original.code}
            </Text>
          )}
        </div>
      ),
    }),
    columnHelper.accessor("contact_person", {
      header: "Contact",
      cell: ({ getValue, row }) => (
        <div>
          {getValue() && (
            <Text className="txt-compact-medium">{getValue()}</Text>
          )}
          {row.original.email && (
            <Text size="small" className="text-ui-fg-subtle">
              {row.original.email}
            </Text>
          )}
          {row.original.phone && (
            <Text size="small" className="text-ui-fg-subtle">
              {row.original.phone}
            </Text>
          )}
        </div>
      ),
    }),
    columnHelper.accessor("is_active", {
      header: "Status",
      cell: ({ getValue }) => (
        <Badge size="2xsmall" color={getValue() ? "green" : "red"}>
          {getValue() ? "Active" : "Inactive"}
        </Badge>
      ),
    }),
    columnHelper.accessor("purchase_orders_count", {
      header: "Orders",
      cell: ({ getValue }) => (
        <Text className="txt-compact-medium">
          {getValue() || 0}
        </Text>
      ),
    }),
    columnHelper.accessor("last_order_date", {
      header: "Last Order",
      cell: ({ getValue }) => (
        <Text className="txt-compact-small text-ui-fg-subtle">
          {getValue() ? new Date(getValue()).toLocaleDateString() : "—"}
        </Text>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="transparent"
            size="small"
            onClick={() => navigate(`/suppliers/${row.original.id}`)}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <EditSupplierForm 
            supplier={row.original}
            trigger={
              <Button
                variant="transparent"
                size="small"
                title="Edit Supplier"
              >
                <PencilSquare className="w-4 h-4" />
              </Button>
            }
          />
          <Button
            variant="transparent"
            size="small"
            onClick={() => navigate(`/purchase-orders?supplier_id=${row.original.id}`)}
            title="View Orders"
          >
            <DocumentText className="w-4 h-4" />
          </Button>
        </div>
      ),
    }),
  ]

  const table = useDataTable({
    data: suppliers,
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
          <Heading>Suppliers</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Manage your supplier database and relationships ({count} suppliers)
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Button size="small" variant="secondary" asChild>
            <Link to="/purchase-orders/create">
              <Plus className="w-4 h-4 mr-2" />
              New Purchase Order
            </Link>
          </Button>
          <CreateSupplierModal />
        </div>
      </div>
      
      <DataTable instance={table}>
        <DataTable.Toolbar className="flex items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-2">
            <DataTable.FilterMenu tooltip="Filter suppliers" />
          </div>
          <div className="flex items-center gap-2">
            <DataTable.Search placeholder="Search suppliers..." />
          </div>
        </DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Suppliers",
  icon: Users,
})

export default SuppliersPage 