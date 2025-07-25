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
  toast
} from "@medusajs/ui"
import type { DataTableFilteringState } from "@medusajs/ui"
import { 
  Plus, 
  Eye, 
  PencilSquare, 
  Trash, 
  Users,
  EllipsisHorizontal,
  DocumentText,
  ArrowUpTray,
  Tools
} from "@medusajs/icons"
import { useSearchParams, useNavigate, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { CreateTechnicianForm } from "../../components/create-technician-form"
import { EditTechnicianForm } from "../../components/edit-technician-form"
import { useCustomTranslation } from "../../hooks/use-custom-translation"

// Types for our technician data
interface Technician {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  employee_id?: string
  department?: string
  position?: string
  hire_date?: string
  certification_level?: string
  certifications?: string
  specializations?: string
  hourly_rate?: string
  salary?: string
  address?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  status: "active" | "inactive" | "on_leave"
  notes?: string
  created_at: string
  updated_at: string
}

const PAGE_SIZE = 20

// Create filter helper
const filterHelper = createDataTableFilterHelper<Technician>()

// Technician filters following native Medusa pattern
const useTechnicianFilters = () => {
  const { t } = useCustomTranslation()
  
  return [
    filterHelper.accessor("status", {
      label: t("custom.general.status"),
      type: "select",
      options: [
        { label: t("custom.technicians.status.active"), value: "active" },
        { label: t("custom.technicians.status.inactive"), value: "inactive" },
        { label: t("custom.technicians.status.on_leave"), value: "on_leave" },
      ],
    }),
    filterHelper.accessor("department", {
      label: t("custom.technicians.department"),
      type: "select",
      options: [
        { label: t("custom.technicians.departments.service"), value: "service" },
        { label: t("custom.technicians.departments.maintenance"), value: "maintenance" },
        { label: t("custom.technicians.departments.support"), value: "support" },
        { label: t("custom.technicians.departments.field_service"), value: "field_service" },
      ],
    }),
    filterHelper.accessor("certification_level", {
      label: t("custom.technicians.certification"),
      type: "select",
      options: [
        { label: t("custom.technicians.certifications.entry"), value: "entry" },
        { label: t("custom.technicians.certifications.intermediate"), value: "intermediate" },
        { label: t("custom.technicians.certifications.advanced"), value: "advanced" },
        { label: t("custom.technicians.certifications.expert"), value: "expert" },
      ],
    }),
    filterHelper.accessor("created_at", {
      label: t("custom.general.created"),
      type: "date",
      format: "date",
      options: [],
    }),
    filterHelper.accessor("hire_date", {
      label: t("custom.technicians.hire_date"),
      type: "date",
      format: "date",
      options: [],
    }),
  ]
}

// Data fetching hook
const useTechnicians = () => {
  return useQuery({
    queryKey: ["technicians"],
    queryFn: async () => {
      const response = await fetch(`/admin/technicians`)
      if (!response.ok) {
        throw new Error("Failed to fetch technicians")
      }
      const data = await response.json()
      return {
        technicians: data.technicians || [],
        count: data.count || 0
      }
    },
  })
}

// Delete technician mutation
const useDeleteTechnician = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/admin/technicians/${id}`, {
        method: "DELETE",
      })
      
      if (!response.ok) {
        throw new Error("Failed to delete technician")
      }
      
      return response.json()
    },
    onSuccess: () => {
      toast.success("Technician deleted successfully")
      queryClient.invalidateQueries({ queryKey: ["technicians"] })
    },
    onError: () => {
      toast.error("Failed to delete technician")
    },
  })
}

// Technician actions component
const TechnicianActions = ({ technician }: { technician: Technician }) => {
  const { t } = useCustomTranslation()
  const navigate = useNavigate()
  const deleteTechnicianMutation = useDeleteTechnician()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (window.confirm(`Are you sure you want to delete technician "${technician.first_name} ${technician.last_name}"?`)) {
      deleteTechnicianMutation.mutate(technician.id)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <IconButton size="small" variant="transparent">
          <EllipsisHorizontal className="h-4 w-4" />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content side="bottom">
        <EditTechnicianForm 
          technician={technician} 
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
          onClick={handleDelete}
          disabled={deleteTechnicianMutation.isPending}
          className="[&>svg]:text-ui-fg-subtle flex items-center gap-2 text-ui-fg-error"
        >
          <Trash className="h-4 w-4" />
          {t("custom.general.delete")}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}

// Route config
export const config = defineRouteConfig({
  label: "Technicians",
  icon: Users,
})

// Technicians list table component - following official DataTable pattern
const TechniciansListTable = () => {
  const { t } = useCustomTranslation()
  const navigate = useNavigate()
  const { data, isLoading, error } = useTechnicians()
  const filters = useTechnicianFilters()
  
  // Filter state management
  const [search, setSearch] = React.useState("")
  const [filtering, setFiltering] = React.useState<DataTableFilteringState>({})
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  })

  // Data processing (move before conditional returns)
  const technicians = data?.technicians || []
  const count = data?.count || 0

  // Status badge helper (move before conditional returns)
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: "green", label: t("custom.technicians.status.active") },
      inactive: { color: "red", label: t("custom.technicians.status.inactive") },
      on_leave: { color: "orange", label: t("custom.technicians.status.on_leave") },
    } as const

    const config = statusConfig[status as keyof typeof statusConfig] || { color: "grey", label: status }
    
    return (
      <Badge size="2xsmall" color={config.color as any}>
        {config.label}
      </Badge>
    )
  }

  // Column helper and definitions (move before conditional returns)
  const columnHelper = createDataTableColumnHelper<Technician>()

  const columns = [
    columnHelper.accessor("first_name", {
      header: "First Name",
      enableSorting: true,
      cell: ({ getValue }) => (
        <Text className="font-medium">{getValue()}</Text>
      ),
    }),
    columnHelper.accessor("last_name", {
      header: "Last Name",
      enableSorting: true,
      cell: ({ getValue }) => (
        <Text className="font-medium">{getValue()}</Text>
      ),
    }),
    columnHelper.accessor("email", {
      header: "Email",
      cell: ({ getValue }) => (
        <Text>{getValue()}</Text>
      ),
    }),
    columnHelper.accessor("phone", {
      header: "Phone",
      cell: ({ getValue }) => (
        <Text>{getValue() || "—"}</Text>
      ),
    }),
    columnHelper.accessor("department", {
      header: t("custom.technicians.department"),
      cell: ({ getValue }) => {
        const dept = getValue()
        if (!dept) return <Text>—</Text>
        
        const deptLabels = {
          service: t("custom.technicians.departments.service"),
          maintenance: t("custom.technicians.departments.maintenance"),
          support: t("custom.technicians.departments.support"),
          field_service: t("custom.technicians.departments.field_service"),
        }
        
        return <Text>{deptLabels[dept as keyof typeof deptLabels] || dept}</Text>
      },
    }),
    columnHelper.accessor("certification_level", {
      header: t("custom.technicians.certification"),
      cell: ({ getValue }) => {
        const cert = getValue()
        if (!cert) return <Text>—</Text>
        
        const certLabels = {
          entry: t("custom.technicians.certifications.entry"),
          intermediate: t("custom.technicians.certifications.intermediate"),
          advanced: t("custom.technicians.certifications.advanced"),
          expert: t("custom.technicians.certifications.expert"),
        }
        
        return <Text>{certLabels[cert as keyof typeof certLabels] || cert}</Text>
      },
    }),
    columnHelper.accessor("status", {
      header: t("custom.general.status"),
      cell: ({ getValue }) => getStatusBadge(getValue()),
    }),
    columnHelper.display({
      id: "actions",
      header: t("custom.general.actions"),
      cell: ({ row }) => <TechnicianActions technician={row.original} />,
    }),
  ]

  // DataTable setup (move before conditional returns)
  const table = useDataTable({
    data: technicians,
    columns,
    filters,
    rowCount: count,
    getRowId: (row) => row.id,
    onRowClick: (event, row) => {
      navigate(`/technicians/${row.id}`)
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
          <Text className="text-ui-fg-subtle">Loading technicians...</Text>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("custom.technicians.title")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Manage your service technicians ({count} technicians)
          </Text>
        </div>
        <CreateTechnicianForm />
      </div>
      <DataTable instance={table}>
        <DataTable.Toolbar className="flex items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-2">
            <DataTable.FilterMenu />
          </div>
          <div className="flex items-center gap-2">
            <DataTable.Search placeholder="Search technicians..." />
          </div>
        </DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>
    </Container>
  )
}

// Main technicians page component
const TechniciansPage = () => {
  return <TechniciansListTable />
}

export default TechniciansPage 