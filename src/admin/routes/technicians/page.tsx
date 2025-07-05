import React from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Plus, Eye, PencilSquare, Trash } from "@medusajs/icons"
import { Container, Heading, Button, Table, Badge, IconButton, Text, createDataTableColumnHelper, DataTable, toast, useDataTable } from "@medusajs/ui"
import { Link, useSearchParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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

// Data fetching hook
const useTechnicians = () => {
  return useQuery({
    queryKey: ["technicians"],
    queryFn: async () => {
      console.log("Fetching technicians from API...")
      const response = await fetch("/admin/technicians")
      console.log("Response status:", response.status)
      
      if (!response.ok) {
        console.error("API response not ok:", response.status, response.statusText)
        throw new Error("Failed to fetch technicians")
      }
      
      const data = await response.json()
      console.log("API response data:", data)
      console.log("Technicians array:", data.technicians)
      console.log("Technicians count:", data.technicians?.length || 0)
      
      return data.technicians || []
    },
  })
}

// Delete technician mutation
const useDeleteTechnician = () => {
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
  })
}

// Define columns for the table
const columnHelper = createDataTableColumnHelper<Technician>()

const columns = [
  columnHelper.accessor("first_name", {
    header: "Name",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">
          {row.original.first_name} {row.original.last_name}
        </span>
        <span className="text-sm text-ui-fg-subtle">
          {row.original.email}
        </span>
      </div>
    ),
  }),
  columnHelper.accessor("employee_id", {
    header: "Employee ID",
    cell: ({ getValue }) => {
      const value = getValue()
      return value || "-"
    },
  }),
  columnHelper.accessor("department", {
    header: "Department",
    cell: ({ getValue }) => {
      const value = getValue()
      return value || "-"
    },
  }),
  columnHelper.accessor("position", {
    header: "Position",
    cell: ({ getValue }) => {
      const value = getValue()
      return value || "-"
    },
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: ({ getValue }) => {
      const status = getValue()
      return (
        <Badge
          size="2xsmall"
          color={
            status === "active"
              ? "green"
              : status === "on_leave"
              ? "orange"
              : "red"
          }
        >
          {status === "on_leave" ? "On Leave" : status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      )
    },
  }),
  columnHelper.accessor("phone", {
    header: "Phone",
    cell: ({ getValue }) => {
      const value = getValue()
      return value || "-"
    },
  }),
  columnHelper.display({
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <TechnicianActions technician={row.original} />,
  }),
]

// Actions component for each row
const TechnicianActions = ({ technician }: { technician: Technician }) => {
  const queryClient = useQueryClient()
  const deleteTechnicianMutation = useDeleteTechnician()
  const navigate = useNavigate()

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this technician?")) {
      try {
        await deleteTechnicianMutation.mutateAsync(technician.id)
        toast.success("Technician deleted successfully")
        queryClient.invalidateQueries({ queryKey: ["technicians"] })
      } catch (error) {
        toast.error("Failed to delete technician")
        console.error("Error deleting technician:", error)
      }
    }
  }

  return (
    <div className="flex items-center gap-2">
      <IconButton
        size="small"
        variant="transparent"
        onClick={() => navigate(`/technicians?id=${technician.id}`)}
      >
        <Eye />
      </IconButton>
      <EditTechnicianForm
        technician={technician}
        trigger={
          <IconButton size="small" variant="transparent">
            <PencilSquare />
          </IconButton>
        }
      />
      <IconButton
        size="small"
        variant="transparent"
        onClick={handleDelete}
        disabled={deleteTechnicianMutation.isPending}
      >
        <Trash />
      </IconButton>
    </div>
  )
}

// Technician detail hook
const useTechnician = (id: string) => {
  return useQuery({
    queryKey: ["technician", id],
    queryFn: async () => {
      const response = await fetch(`/admin/technicians/${id}`)
      if (!response.ok) {
        throw new Error("Failed to fetch technician")
      }
      const data = await response.json()
      return data.technician
    },
    enabled: !!id,
  })
}

// Technician Detail Component
const TechnicianDetail = ({ technicianId }: { technicianId: string }) => {
  const { data: technician, isLoading, error } = useTechnician(technicianId)
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Text>Loading technician details...</Text>
      </div>
    )
  }

  if (error || !technician) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Text className="text-ui-fg-error">
          Failed to load technician details. Please try again.
        </Text>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="bg-ui-bg-base border border-ui-border-base rounded-lg overflow-hidden h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-base">
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              size="small"
              onClick={() => navigate("/technicians")}
            >
              ← Back to Technicians
            </Button>
            <div>
              <Heading level="h1">
                {technician.first_name} {technician.last_name}
              </Heading>
              <Text className="text-ui-fg-subtle">
                {technician.email}
              </Text>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <EditTechnicianForm
              technician={technician}
              trigger={<Button size="small">Edit Technician</Button>}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <Heading level="h2">Personal Information</Heading>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Text className="text-ui-fg-subtle text-sm">Employee ID</Text>
                  <Text>{technician.employee_id || "-"}</Text>
                </div>
                <div>
                  <Text className="text-ui-fg-subtle text-sm">Phone</Text>
                  <Text>{technician.phone || "-"}</Text>
                </div>
                <div>
                  <Text className="text-ui-fg-subtle text-sm">Status</Text>
                  <Badge
                    size="2xsmall"
                    color={
                      technician.status === "active"
                        ? "green"
                        : technician.status === "on_leave"
                        ? "orange"
                        : "red"
                    }
                  >
                    {technician.status === "on_leave" ? "On Leave" : technician.status.charAt(0).toUpperCase() + technician.status.slice(1)}
                  </Badge>
                </div>
                <div>
                  <Text className="text-ui-fg-subtle text-sm">Address</Text>
                  <Text>{technician.address || "-"}</Text>
                </div>
              </div>
            </div>

            {/* Employment Information */}
            <div className="space-y-4">
              <Heading level="h2">Employment Information</Heading>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Text className="text-ui-fg-subtle text-sm">Department</Text>
                  <Text>{technician.department || "-"}</Text>
                </div>
                <div>
                  <Text className="text-ui-fg-subtle text-sm">Position</Text>
                  <Text>{technician.position || "-"}</Text>
                </div>
                <div>
                  <Text className="text-ui-fg-subtle text-sm">Hire Date</Text>
                  <Text>{technician.hire_date || "-"}</Text>
                </div>
                <div>
                  <Text className="text-ui-fg-subtle text-sm">Certification Level</Text>
                  <Text>{technician.certification_level || "-"}</Text>
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="space-y-4">
              <Heading level="h2">Professional Information</Heading>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Text className="text-ui-fg-subtle text-sm">Certifications</Text>
                  <Text>{technician.certifications || "-"}</Text>
                </div>
                <div>
                  <Text className="text-ui-fg-subtle text-sm">Specializations</Text>
                  <Text>{technician.specializations || "-"}</Text>
                </div>
                <div>
                  <Text className="text-ui-fg-subtle text-sm">Hourly Rate</Text>
                  <Text>{technician.hourly_rate || "-"}</Text>
                </div>
                <div>
                  <Text className="text-ui-fg-subtle text-sm">Salary</Text>
                  <Text>{technician.salary || "-"}</Text>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4">
              <Heading level="h2">Emergency Contact</Heading>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Text className="text-ui-fg-subtle text-sm">Name</Text>
                  <Text>{technician.emergency_contact_name || "-"}</Text>
                </div>
                <div>
                  <Text className="text-ui-fg-subtle text-sm">Phone</Text>
                  <Text>{technician.emergency_contact_phone || "-"}</Text>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {technician.notes && (
            <div className="mt-6 space-y-4">
              <Heading level="h2">Notes</Heading>
              <div className="bg-ui-bg-subtle rounded-lg p-4">
                <Text>{technician.notes}</Text>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Main Technicians Page Component
const TechniciansPage = () => {
  const [searchParams] = useSearchParams()
  const technicianId = searchParams.get("id")
  
  if (technicianId) {
    return <TechnicianDetail technicianId={technicianId} />
  }
  
  return <TechniciansList />
}

// Technicians List Component
const TechniciansList = () => {
  const { data: technicians = [], isLoading, error } = useTechnicians()
  const navigate = useNavigate()

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Text className="text-ui-fg-error">
          Failed to load technicians. Please try again.
        </Text>
      </div>
    )
  }

  const table = useDataTable({
    columns,
    data: technicians,
    getRowId: (row) => row.id,
    rowCount: technicians.length,
    isLoading,
    onRowClick: (row) => {
      navigate(`/technicians?id=${row.original.id}`)
    },
  })

  return (
    <div className="flex h-full w-full flex-col">
      {/* Main Content Card */}
      <div className="flex-1 overflow-hidden">
        <div className="bg-ui-bg-base border border-ui-border-base rounded-lg overflow-hidden h-full flex flex-col">
          {/* Header inside card */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-base">
            <div>
              <Heading level="h1">Technicians</Heading>
              <Text className="text-ui-fg-subtle">
                Manage your technician team
              </Text>
            </div>
            <CreateTechnicianForm />
          </div>

          {/* Table */}
          <div className="flex-1 overflow-hidden">
            <DataTable table={table} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default TechniciansPage

export const config = defineRouteConfig({
  label: "Technicians",
  path: "/technicians",
}) 