import React from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Plus, Eye, PencilSquare, Trash, Users } from "@medusajs/icons"
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
import { useSearchParams, useNavigate, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { CreateTechnicianForm } from "../../components/create-technician-form"
import { EditTechnicianForm } from "../../components/edit-technician-form"

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
  const navigate = useNavigate()
  const deleteTechnicianMutation = useDeleteTechnician()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (window.confirm(`Are you sure you want to delete "${technician.first_name} ${technician.last_name}"?`)) {
      deleteTechnicianMutation.mutate(technician.id)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <IconButton
        size="small"
        variant="transparent"
        onClick={(e) => {
          e.stopPropagation()
          navigate(`/technicians/${technician.id}`)
        }}
      >
        <Eye className="h-4 w-4" />
      </IconButton>
      <EditTechnicianForm technician={technician} trigger={
        <IconButton 
          size="small"
          variant="transparent"
        >
          <PencilSquare className="h-4 w-4" />
        </IconButton>
      } />
      <IconButton
        size="small"
        variant="transparent"
        onClick={handleDelete}
        disabled={deleteTechnicianMutation.isPending}
      >
        <Trash className="h-4 w-4" />
      </IconButton>
    </div>
  )
}

// Route config
export const config = defineRouteConfig({
  label: "Technicians",
  icon: Users,
})

// Technicians list table component - following official DataTable pattern
const TechniciansListTable = () => {
  const navigate = useNavigate()
  const { data, isLoading, error } = useTechnicians()

  if (error) {
    throw error
  }

  const technicians = data?.technicians || []
  const count = data?.count || 0

  // Status badge helper
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: "green", label: "Active" },
      inactive: { color: "red", label: "Inactive" },
      on_leave: { color: "orange", label: "On Leave" },
    } as const

    const config = statusConfig[status as keyof typeof statusConfig] || { color: "grey", label: status }
    
    return (
      <Badge size="2xsmall" color={config.color as any}>
        {config.label}
      </Badge>
    )
  }

  // Column helper - following official pattern
  const columnHelper = createDataTableColumnHelper<Technician>()

  const columns = [
    columnHelper.display({
      id: "name",
      header: "Name",
      cell: ({ row }) => {
        const technician = row.original
        return (
          <div className="flex flex-col">
            <Text weight="plus" size="small">
              {technician.first_name} {technician.last_name}
            </Text>
            <Text size="xsmall" className="text-ui-fg-subtle">
              {technician.email}
            </Text>
          </div>
        )
      },
    }),
    columnHelper.accessor("employee_id", {
      header: "Employee ID",
      cell: ({ getValue }) => (
        <Text size="small">{getValue() || "—"}</Text>
      ),
    }),
    columnHelper.accessor("department", {
      header: "Department",
      cell: ({ getValue }) => (
        <Text size="small">{getValue() || "—"}</Text>
      ),
    }),
    columnHelper.accessor("position", {
      header: "Position",
      cell: ({ getValue }) => (
        <Text size="small">{getValue() || "—"}</Text>
      ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ getValue }) => getStatusBadge(getValue()),
    }),
    columnHelper.accessor("phone", {
      header: "Phone",
      cell: ({ getValue }) => (
        <Text size="small">{getValue() || "—"}</Text>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => <TechnicianActions technician={row.original} />,
    }),
  ]

  // Table instance - following official pattern
  const table = useDataTable({
    data: technicians,
    columns,
    getRowId: (row) => row.id,
    rowCount: count,
    isLoading,
  })

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>Technicians</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Manage your service technicians ({count} technicians)
          </Text>
        </div>
        <CreateTechnicianForm />
      </div>
      <DataTable instance={table}>
        <DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
          <div className="flex gap-2">
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