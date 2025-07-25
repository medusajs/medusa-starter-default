import { useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { 
  Button, 
  Badge, 
  Container, 
  Heading, 
  Text,
  DataTable,
  useDataTable,
  createDataTableColumnHelper,
  createDataTableFilterHelper,
  DropdownMenu,
  IconButton
} from "@medusajs/ui"
import type { DataTableFilteringState } from "@medusajs/ui"
import { 
  Plus, 
  Eye, 
  PencilSquare, 
  DocumentText, 
  Buildings,
  EllipsisHorizontal,
  Trash,
  ArrowUpTray
} from "@medusajs/icons"
import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "react-router-dom"
import { CreateSupplierModal } from "../../components/create-supplier-modal"
import { EditSupplierForm } from "../../components/edit-supplier-form"
import { useCustomTranslation } from "../../hooks/use-custom-translation"

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

// Supplier actions component
const SupplierActions = ({ supplier }: { supplier: Supplier }) => {
  const { t } = useCustomTranslation()
  
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <IconButton size="small" variant="transparent">
          <EllipsisHorizontal className="h-4 w-4" />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content side="bottom">
        <EditSupplierForm 
          supplier={supplier}
          trigger={
            <DropdownMenu.Item
              onSelect={(e) => {
                e.preventDefault()
              }}
              className="[&>svg]:text-ui-fg-subtle flex items-center gap-2"
            >
              <PencilSquare className="h-4 w-4" />
              {t("custom.general.edit")}
            </DropdownMenu.Item>
          }
        />
        <DropdownMenu.Item
          onClick={(e) => {
            e.stopPropagation()
            // TODO: Add delete supplier functionality
            console.log('Delete supplier:', supplier.id)
          }}
          className="[&>svg]:text-ui-fg-subtle flex items-center gap-2 text-ui-fg-error"
        >
          <Trash className="h-4 w-4" />
          {t("custom.general.delete")}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}

const SuppliersPage = () => {
  const { t } = useCustomTranslation()
  const navigate = useNavigate()
  const { data, isLoading, error } = useSuppliers()
  
  const [search, setSearch] = useState("")
  const [filtering, setFiltering] = useState<DataTableFilteringState>({})
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  })

  const columnHelper = createDataTableColumnHelper<Supplier>()
  const filterHelper = createDataTableFilterHelper<Supplier>()

  const filters = [
    filterHelper.accessor("is_active", {
      label: t("custom.general.status"),
      type: "select",
      options: [
        { label: t("custom.general.active"), value: "true" },
        { label: t("custom.general.inactive"), value: "false" },
      ],
    }),
  ]

  // Data processing (move before conditional returns)
  const suppliers = data?.suppliers || []
  const count = data?.count || 0

  // Column definitions (move before conditional returns)
  const columns = [
    columnHelper.accessor("name", {
      header: t("custom.suppliers.title"),
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
            <Text className="text-ui-fg-subtle" size="small">
              {t("custom.suppliers.code")}: {row.original.code}
            </Text>
          )}
        </div>
      ),
    }),
    columnHelper.accessor("email", {
      header: t("custom.suppliers.email"),
      cell: ({ getValue }) => (
        <Text>{getValue() || "—"}</Text>
      ),
    }),
    columnHelper.accessor("phone", {
      header: t("custom.suppliers.phone"),
      cell: ({ getValue }) => (
        <Text>{getValue() || "—"}</Text>
      ),
    }),
    columnHelper.accessor("city", {
      header: "City",
      cell: ({ getValue }) => (
        <Text>{getValue() || "—"}</Text>
      ),
    }),
    columnHelper.accessor("is_active", {
      header: t("custom.general.status"),
      cell: ({ getValue }) => (
        <Badge 
          size="2xsmall" 
          color={getValue() ? "green" : "red"}
        >
          {getValue() ? t("custom.general.active") : t("custom.general.inactive")}
        </Badge>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: t("custom.general.actions"),
      cell: ({ row }) => <SupplierActions supplier={row.original} />,
    }),
  ]

  // DataTable setup (move before conditional returns)
  const table = useDataTable({
    data: suppliers,
    columns,
    filters,
    rowCount: count,
    getRowId: (row) => row.id,
    onRowClick: (event, row) => {
      navigate(`/suppliers/${row.id}`)
    },
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

  // NOW we can have conditional returns after all hooks are called
  if (error) {
    throw error
  }

  // Show loading state
  if (isLoading) {
    return (
      <Container className="p-6">
        <div className="flex items-center justify-center h-32">
          <Text className="text-ui-fg-subtle">Loading suppliers...</Text>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("custom.suppliers.title")}</Heading>
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
  icon: Buildings,
})

export default SuppliersPage 