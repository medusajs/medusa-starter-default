import React from "react"
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
  IconButton,
  toast,
  StatusBadge
} from "@medusajs/ui"
import type { DataTableFilteringState } from "@medusajs/ui"
import { 
  Plus, 
  Eye, 
  PencilSquare, 
  ArrowDownTray, 
  DocumentText,
  EllipsisHorizontal,
  Trash,
  ArrowUpTray,
  Clock,
  CheckCircleSolid,
  ExclamationCircleSolid,
  XCircle,
  ReceiptPercent,
  ShieldCheck,
  Buildings,
  User
} from "@medusajs/icons"
import { useNavigate, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useCustomTranslation } from "../../hooks/use-custom-translation"

// Types for warranty data
interface Warranty {
  id: string
  warranty_number: string
  warranty_type: "manufacturer" | "supplier" | "extended" | "goodwill"
  status: "draft" | "submitted" | "approved" | "reimbursed" | "rejected" | "closed"
  warranty_claim_number?: string
  warranty_provider?: string
  claim_reference?: string
  labor_cost: number
  parts_cost: number
  total_cost: number
  reimbursement_amount: number
  currency_code: string
  warranty_start_date?: string
  warranty_end_date?: string
  claim_date?: string
  approval_date?: string
  reimbursement_date?: string
  description?: string
  failure_description?: string
  repair_description?: string
  notes?: string
  internal_notes?: string
  service_order_id: string
  customer_id?: string
  machine_id?: string
  customer?: {
    id: string
    first_name: string
    last_name: string
    company_name?: string
    email: string
  }
  machine?: {
    id: string
    model_number: string
    serial_number: string
    brand: string
  }
  service_order?: {
    id: string
    service_order_number: string
    service_type: string
  }
  created_at: string
  updated_at: string
}

// Format currency for Belgian locale
const formatCurrency = (amount: number, currencyCode = "EUR") => {
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(amount)
}

// Format date for Belgian locale
const formatDate = (date: string) => {
  return new Intl.DateTimeFormat("nl-BE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date))
}

// Status badge component
const WarrantyStatusBadge = ({ status }: { status: Warranty["status"] }) => {
  const { t } = useCustomTranslation()
  
  const statusConfig = {
    draft: { color: "grey" as const, icon: PencilSquare, label: t("custom.warranties.status.draft") },
    submitted: { color: "blue" as const, icon: ArrowUpTray, label: t("custom.warranties.status.submitted") },
    approved: { color: "green" as const, icon: CheckCircleSolid, label: t("custom.warranties.status.approved") },
    reimbursed: { color: "green" as const, icon: ReceiptPercent, label: t("custom.warranties.status.reimbursed") },
    rejected: { color: "red" as const, icon: XCircle, label: t("custom.warranties.status.rejected") },
    closed: { color: "grey" as const, icon: Clock, label: t("custom.warranties.status.closed") }
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <StatusBadge color={config.color} className="flex items-center gap-1">
      <Icon className="w-3 h-3" />
      {config.label}
    </StatusBadge>
  )
}

// Warranty type badge component
const WarrantyTypeBadge = ({ type }: { type: Warranty["warranty_type"] }) => {
  const { t } = useCustomTranslation()
  
  const typeConfig = {
    manufacturer: { color: "blue" as const, icon: Buildings, label: t("custom.warranties.type.manufacturer") },
    supplier: { color: "orange" as const, icon: Buildings, label: t("custom.warranties.type.supplier") },
    extended: { color: "purple" as const, icon: ShieldCheck, label: t("custom.warranties.type.extended") },
    goodwill: { color: "green" as const, icon: ShieldCheck, label: t("custom.warranties.type.goodwill") }
  }

  const config = typeConfig[type]
  const Icon = config.icon

  return (
    <StatusBadge color={config.color} className="flex items-center gap-1">
      <Icon className="w-3 h-3" />
      {config.label}
    </StatusBadge>
  )
}

// Custom hook for fetching warranties
const useWarranties = () => {
  return useQuery({
    queryKey: ["warranties"],
    queryFn: async () => {
      const response = await fetch("/admin/warranties")
      if (!response.ok) {
        throw new Error("Failed to fetch warranties")
      }
      return response.json()
    },
  })
}

// Custom hook for warranty filters
const useWarrantyFilters = () => {
  const filterHelper = createDataTableFilterHelper<Warranty>()
  
  return [
    filterHelper.accessor("status", {
      label: "Status",
      type: "select",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Submitted", value: "submitted" },
        { label: "Approved", value: "approved" },
        { label: "Reimbursed", value: "reimbursed" },
        { label: "Rejected", value: "rejected" },
        { label: "Closed", value: "closed" },
      ],
    }),
    filterHelper.accessor("warranty_type", {
      label: "Type",
      type: "select",
      options: [
        { label: "Manufacturer", value: "manufacturer" },
        { label: "Supplier", value: "supplier" },
        { label: "Extended", value: "extended" },
        { label: "Goodwill", value: "goodwill" },
      ],
    }),
  ]
}

// Custom hook for deleting warranties
const useDeleteWarranty = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (warrantyId: string) => {
      const response = await fetch(`/admin/warranties/${warrantyId}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        throw new Error("Failed to delete warranty")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warranties"] })
      toast.success("Warranty deleted successfully")
    },
    onError: (error) => {
      toast.error("Failed to delete warranty")
      console.error("Delete warranty error:", error)
    },
  })
}

// Actions component for warranty row
const WarrantyActions = ({ warranty }: { warranty: Warranty }) => {
  const { t } = useCustomTranslation()
  const navigate = useNavigate()
  const deleteWarranty = useDeleteWarranty()

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete warranty ${warranty.warranty_number}?`)) {
      await deleteWarranty.mutateAsync(warranty.id)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <IconButton size="small" variant="transparent">
          <EllipsisHorizontal className="w-4 h-4" />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item asChild>
          <Link to={`/warranties/${warranty.id}`}>
            <Eye className="w-4 h-4 mr-2" />
            {t("custom.general.view")}
          </Link>
        </DropdownMenu.Item>
        <DropdownMenu.Item asChild>
          <Link to={`/warranties/${warranty.id}/edit`}>
            <PencilSquare className="w-4 h-4 mr-2" />
            {t("custom.general.edit")}
          </Link>
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item onClick={handleDelete} className="text-red-600">
          <Trash className="w-4 h-4 mr-2" />
          {t("custom.general.delete")}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}

// Main warranties list table component
const WarrantiesListTable = () => {
  const { t } = useCustomTranslation()
  const navigate = useNavigate()
  const { data, isLoading, error } = useWarranties()
  const filters = useWarrantyFilters()
  
  // Filter state management
  const [search, setSearch] = useState("")
  const [filtering, setFiltering] = useState<DataTableFilteringState>({})
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  })

  // Data processing
  const warranties = data?.warranties || []
  const count = data?.count || 0

  // Column helper and definitions
  const columnHelper = createDataTableColumnHelper<Warranty>()

  const columns = [
    columnHelper.accessor("warranty_number", {
      header: t("custom.warranties.number"),
      enableSorting: true,
      cell: ({ getValue, row }) => (
        <Link 
          to={`/warranties/${row.original.id}`}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          {getValue()}
        </Link>
      ),
    }),
    columnHelper.accessor("warranty_type", {
      header: t("custom.warranties.type"),
      cell: ({ getValue }) => <WarrantyTypeBadge type={getValue()} />,
    }),
    columnHelper.accessor("status", {
      header: t("custom.general.status"),
      cell: ({ getValue }) => <WarrantyStatusBadge status={getValue()} />,
    }),
    columnHelper.accessor("customer", {
      header: "Customer",
      cell: ({ getValue }) => {
        const customer = getValue()
        if (!customer) return <Text className="text-ui-fg-muted">No customer</Text>
        
        const name = customer.company_name || `${customer.first_name} ${customer.last_name}`
        return (
          <div>
            <Text size="small" weight="plus">{name}</Text>
            <Text size="xsmall" className="text-ui-fg-subtle">{customer.email}</Text>
          </div>
        )
      },
    }),
    columnHelper.accessor("machine", {
      header: "Machine",
      cell: ({ getValue }) => {
        const machine = getValue()
        if (!machine) return <Text className="text-ui-fg-muted">No machine</Text>
        
        return (
          <div>
            <Text size="small" weight="plus">{machine.brand} {machine.model_number}</Text>
            <Text size="xsmall" className="text-ui-fg-subtle">SN: {machine.serial_number}</Text>
          </div>
        )
      },
    }),
    columnHelper.accessor("total_cost", {
      header: "Total Cost",
      cell: ({ getValue }) => {
        const total = getValue() || 0
        return (
          <Text size="small" className="font-mono">
            {formatCurrency(total)}
          </Text>
        )
      },
    }),
    columnHelper.accessor("reimbursement_amount", {
      header: "Reimbursed",
      cell: ({ getValue }) => {
        const amount = getValue() || 0
        return (
          <Text size="small" className="font-mono">
            {formatCurrency(amount)}
          </Text>
        )
      },
    }),
    columnHelper.accessor("claim_date", {
      header: "Claim Date",
      cell: ({ getValue }) => {
        const date = getValue()
        if (!date) return <Text className="text-ui-fg-muted">-</Text>
        return (
          <Text size="small">
            {formatDate(date)}
          </Text>
        )
      },
    }),
    columnHelper.display({
      id: "actions",
      header: t("custom.general.actions"),
      cell: ({ row }) => <WarrantyActions warranty={row.original} />,
    }),
  ]

  // DataTable setup
  const table = useDataTable({
    data: warranties,
    columns,
    filters,
    rowCount: count,
    getRowId: (row) => row.id,
    onRowClick: (event, row) => {
      navigate(`/warranties/${row.id}`)
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

  // Error handling
  if (error) {
    throw error
  }

  // Loading state
  if (isLoading) {
    return (
      <Container className="p-6">
        <div className="flex items-center justify-center h-32">
          <Text className="text-ui-fg-subtle">Loading warranties...</Text>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("custom.warranties.title")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Manage warranty claims and reimbursements ({count} warranties)
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Button size="small" variant="secondary" asChild>
            <Link to="/warranties/analytics">
              <ReceiptPercent className="w-4 h-4 mr-2" />
              Analytics
            </Link>
          </Button>
          <Button size="small" variant="secondary" asChild>
            <Link to="/warranties/create">
              <Plus className="w-4 h-4 mr-2" />
              {t("custom.warranties.create")}
            </Link>
          </Button>
        </div>
      </div>

      <DataTable instance={table}>
        <DataTable.Toolbar className="flex items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-2">
            <DataTable.FilterMenu />
          </div>
          <div className="flex items-center gap-2">
            <DataTable.Search placeholder="Search warranties..." />
          </div>
        </DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>
    </Container>
  )
}

// Route config
export const config = defineRouteConfig({
  label: "Warranties",
  icon: ShieldCheck,
})

// Main warranties page component
const WarrantiesPage = () => {
  return <WarrantiesListTable />
}

export default WarrantiesPage 