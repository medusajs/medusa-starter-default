import React from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Plus, Eye, PencilSquare, Trash, Tools } from "@medusajs/icons"
import { Container, Heading, Button, Table, Badge, IconButton, Text, createDataTableColumnHelper, DataTable, toast, useDataTable } from "@medusajs/ui"
import { Link, useSearchParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { CreateMachineForm } from "../../components/create-machine-form"
import { EditMachineForm } from "../../components/edit-machine-form"

// Types for our machine data
interface Machine {
  id: string
  brand: string
  model: string
  serial_number: string
  year: string
  engine_hours?: string
  fuel_type: string
  horsepower?: string
  weight?: string
  purchase_date?: string
  purchase_price?: string
  current_value?: string
  status: "active" | "inactive" | "maintenance"
  location?: string
  notes?: string
  customer_id?: string
  created_at: string
  updated_at: string
}

// Data fetching hook
const useMachines = () => {
  return useQuery({
    queryKey: ["machines"],
    queryFn: async () => {
      console.log("Fetching machines from API...")
      const response = await fetch("/admin/machines")
      console.log("Response status:", response.status)
      
      if (!response.ok) {
        console.error("API response not ok:", response.status, response.statusText)
        throw new Error("Failed to fetch machines")
      }
      
      const data = await response.json()
      console.log("API response data:", data)
      console.log("Machines array:", data.machines)
      console.log("Machines count:", data.machines?.length || 0)
      
      return data.machines || []
    },
  })
}

// Delete machine mutation
const useDeleteMachine = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/admin/machines/${id}`, {
        method: "DELETE",
      })
      
      if (!response.ok) {
        throw new Error("Failed to delete machine")
      }
      
      return response.json()
    },
  })
}

// Column helper for type-safe table columns
const columnHelper = createDataTableColumnHelper<Machine>()

// Table column definitions
const columns = [
  columnHelper.accessor("brand", {
    header: "Brand",
    enableSorting: true,
    sortLabel: "Brand",
    sortAscLabel: "A-Z",
    sortDescLabel: "Z-A",
  }),
  columnHelper.accessor("model", {
    header: "Model",
    enableSorting: true,
    sortLabel: "Model",
  }),
  columnHelper.accessor("serial_number", {
    header: "Serial Number",
    cell: ({ getValue }) => (
      <Text className="font-mono text-sm">{getValue()}</Text>
    ),
  }),
  columnHelper.accessor("year", {
    header: "Year",
    enableSorting: true,
    sortLabel: "Year",
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: ({ getValue }) => {
      const status = getValue()
      return (
        <Badge 
          variant={status === "active" ? "green" : status === "maintenance" ? "orange" : "red"}
          size="small"
        >
          {status}
        </Badge>
      )
    },
  }),
  columnHelper.accessor("location", {
    header: "Location",
    cell: ({ getValue }) => (
      <Text>{getValue() || "-"}</Text>
    ),
  }),
  columnHelper.display({
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const machine = row.original
      return <MachineActions machine={machine} />
    },
  }),
]

// Machine Actions Component
const MachineActions = ({ machine }: { machine: Machine }) => {
  const queryClient = useQueryClient()
  const deleteMachineMutation = useDeleteMachine()
  const navigate = useNavigate()

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!confirm(`Are you sure you want to delete ${machine.brand} ${machine.model}?`)) {
      return
    }

    try {
      await deleteMachineMutation.mutateAsync(machine.id)
      toast.success("Machine deleted successfully!")
      // Refresh the machines list
      queryClient.invalidateQueries({ queryKey: ["machines"] })
    } catch (error) {
      toast.error("Failed to delete machine. Please try again.")
    }
  }

  return (
    <div className="flex items-center gap-2">
      <IconButton
        variant="transparent"
        size="small"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation()
          navigate(`/machines?id=${machine.id}`)
        }}
      >
        <Eye className="w-4 h-4" />
      </IconButton>
      <EditMachineForm 
        machine={machine}
        trigger={
          <IconButton
            variant="transparent"
            size="small"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
            }}
          >
            <PencilSquare className="w-4 h-4" />
          </IconButton>
        }
      />
      <IconButton
        variant="transparent"
        size="small"
        onClick={handleDelete}
        disabled={deleteMachineMutation.isPending}
      >
        <Trash className="w-4 h-4" />
      </IconButton>
    </div>
  )
}

// Machine detail hook
const useMachine = (id: string) => {
  return useQuery({
    queryKey: ["machine", id],
    queryFn: async () => {
      const response = await fetch(`/admin/machines/${id}`)
      if (!response.ok) {
        throw new Error("Failed to fetch machine")
      }
      const data = await response.json()
      return data.machine
    },
    enabled: !!id,
  })
}

// Main Machines Page Component
const MachinesPage = () => {
  const [searchParams] = useSearchParams()
  const machineId = searchParams.get("id")
  
  if (machineId) {
    return <MachineDetail machineId={machineId} />
  }
  
  return <MachinesList />
}

// Machines List Component
const MachinesList = () => {
  const { data: machines = [], isLoading, error } = useMachines()
  const navigate = useNavigate()

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Text className="text-ui-fg-error">
          Failed to load machines. Please try again.
        </Text>
      </div>
    )
  }

  const table = useDataTable({
    columns,
    data: machines,
    getRowId: (row) => row.id,
    rowCount: machines.length,
    isLoading,
    onRowClick: (row) => {
      navigate(`/machines?id=${row.original.id}`)
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
              <Heading level="h1">Machines</Heading>
              <Text className="text-ui-fg-subtle">
                Manage your machine fleet
              </Text>
            </div>
            <CreateMachineForm />
          </div>

          {/* Filter Section */}
          <div className="px-6 py-4 border-b border-ui-border-base">
            <div className="flex items-center justify-between">
              <Button variant="secondary" size="small">
                Filter toevoegen
              </Button>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Zoeken"
                    className="w-64 px-3 py-2 text-sm border border-ui-border-base rounded-md bg-ui-bg-base text-ui-fg-base placeholder:text-ui-fg-muted focus:outline-none focus:ring-1 focus:ring-ui-border-interactive"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* DataTable */}
          <div className="flex-1 overflow-auto">
            {machines.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <Text className="text-ui-fg-subtle mb-2">No machines found</Text>
                  <Text className="text-ui-fg-muted text-sm">
                    Create your first machine to get started
                  </Text>
                </div>
              </div>
            ) : (
              <DataTable instance={table}>
                <DataTable.Table />
              </DataTable>
            )}
          </div>

          {/* Pagination Footer */}
          <div className="px-6 py-4 border-t border-ui-border-base">
            <div className="flex items-center justify-between">
              <Text className="text-ui-fg-subtle text-sm">
                1 — {machines.length} van {machines.length} resultaten
              </Text>
              <div className="flex items-center gap-2">
                <Text className="text-ui-fg-subtle text-sm">
                  1 van 1 pagina's
                </Text>
                <div className="flex items-center gap-1">
                  <Button variant="secondary" size="small" disabled>
                    Vorige
                  </Button>
                  <Button variant="secondary" size="small" disabled>
                    Volgende
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Machine Detail Component
const MachineDetail = ({ machineId }: { machineId: string }) => {
  const { data: machine, isLoading, error } = useMachine(machineId)

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Text>Loading machine details...</Text>
      </div>
    )
  }

  if (error || !machine) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Text className="text-ui-fg-error">
          Failed to load machine details. Please try again.
        </Text>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col">
      {/* Header */}
      <div className="px-6 py-4">
        <Button variant="secondary" size="small" asChild className="mb-4">
          <Link to="/machines">
            ← Back to Machines
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <Heading level="h1">
              {machine.brand} {machine.model}
            </Heading>
            <Text className="text-ui-fg-subtle">
              Serial: {machine.serial_number}
            </Text>
          </div>
          <div className="flex items-center gap-2">
            <EditMachineForm 
              machine={machine}
              trigger={
                <Button variant="secondary" size="small">
                  <PencilSquare className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              }
            />
            <Button variant="danger" size="small">
              <Trash className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Machine Details Grid */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
            <Heading level="h3" className="mb-4">
              Basic Information
            </Heading>
            <div className="space-y-4">
              <DetailRow label="Brand" value={machine.brand} />
              <DetailRow label="Model" value={machine.model} />
              <DetailRow label="Serial Number" value={machine.serial_number} />
              <DetailRow label="Year" value={machine.year} />
              <DetailRow label="Status" value={machine.status} />
              <DetailRow label="Fuel Type" value={machine.fuel_type} />
            </div>
          </div>

          {/* Technical Specifications */}
          <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
            <Heading level="h3" className="mb-4">
              Technical Specifications
            </Heading>
            <div className="space-y-4">
              <DetailRow label="Engine Hours" value={machine.engine_hours || "-"} />
              <DetailRow label="Horsepower" value={machine.horsepower || "-"} />
              <DetailRow label="Weight" value={machine.weight || "-"} />
              <DetailRow label="Location" value={machine.location || "-"} />
            </div>
          </div>

          {/* Financial Information */}
          <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
            <Heading level="h3" className="mb-4">
              Financial Information
            </Heading>
            <div className="space-y-4">
              <DetailRow label="Purchase Date" value={machine.purchase_date || "-"} />
              <DetailRow label="Purchase Price" value={machine.purchase_price || "-"} />
              <DetailRow label="Current Value" value={machine.current_value || "-"} />
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
            <Heading level="h3" className="mb-4">
              Additional Information
            </Heading>
            <div className="space-y-4">
              <DetailRow label="Customer ID" value={machine.customer_id || "-"} />
              <DetailRow label="Created" value={new Date(machine.created_at).toLocaleDateString()} />
              <DetailRow label="Updated" value={new Date(machine.updated_at).toLocaleDateString()} />
            </div>
            {machine.notes && (
              <div className="mt-4">
                <Text size="small" weight="medium" className="text-ui-fg-base mb-2">
                  Notes
                </Text>
                <Text size="small" className="text-ui-fg-subtle">
                  {machine.notes}
                </Text>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper component for detail rows
const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div>
    <Text size="small" weight="medium" className="text-ui-fg-base">
      {label}
    </Text>
    <Text size="small" className="text-ui-fg-subtle mt-1">
      {value}
    </Text>
  </div>
)

export const config = defineRouteConfig({
  label: "Machines",
  path: "/machines",
  icon: Tools,
})

export default MachinesPage
