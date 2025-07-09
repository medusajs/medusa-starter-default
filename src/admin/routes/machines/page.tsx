import React from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Plus, Eye, PencilSquare, Trash, Tools } from "@medusajs/icons"
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
import { CreateMachineForm } from "../../components/machines/create-machine-form"
import { EditMachineForm } from "../../components/edit-machine-form"

// Types for our machine data - matching what EditMachineForm expects
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

const PAGE_SIZE = 20

// Data fetching hook
const useMachines = () => {
  return useQuery({
    queryKey: ["machines"],
    queryFn: async () => {
      const response = await fetch(`/admin/machines`)
      if (!response.ok) {
        throw new Error("Failed to fetch machines")
      }
      const data = await response.json()
      return {
        machines: data.machines || [],
        count: data.count || 0
      }
    },
  })
}

// Delete machine mutation
const useDeleteMachine = () => {
  const queryClient = useQueryClient()
  
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
    onSuccess: () => {
      toast.success("Machine deleted successfully")
      queryClient.invalidateQueries({ queryKey: ["machines"] })
    },
    onError: () => {
      toast.error("Failed to delete machine")
    },
  })
}

// Machine actions component
const MachineActions = ({ machine }: { machine: Machine }) => {
  const navigate = useNavigate()
  const deleteMachineMutation = useDeleteMachine()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (window.confirm(`Are you sure you want to delete machine "${machine.brand} ${machine.model}"?`)) {
      deleteMachineMutation.mutate(machine.id)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <IconButton
        size="small"
        variant="transparent"
        onClick={(e) => {
          e.stopPropagation()
          navigate(`/machines/${machine.id}`)
        }}
      >
        <Eye className="h-4 w-4" />
      </IconButton>
      <EditMachineForm machine={machine} trigger={
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
        disabled={deleteMachineMutation.isPending}
      >
        <Trash className="h-4 w-4" />
      </IconButton>
    </div>
  )
}

// Route config
export const config = defineRouteConfig({
  label: "Machines",
  icon: Tools,
})

// Machines list table component - following official DataTable pattern
const MachinesListTable = () => {
  const navigate = useNavigate()
  const { data, isLoading, error } = useMachines()
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  })

  if (error) {
    throw error
  }

  const machines = data?.machines || []
  const count = data?.count || 0

  // Status badge helper
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: "green", label: "Active" },
      inactive: { color: "red", label: "Inactive" },
      maintenance: { color: "orange", label: "Maintenance" },
    } as const

    const config = statusConfig[status as keyof typeof statusConfig] || { color: "grey", label: status }
    
    return (
      <Badge size="2xsmall" color={config.color as any}>
        {config.label}
      </Badge>
    )
  }

  // Column helper - following official pattern
  const columnHelper = createDataTableColumnHelper<Machine>()

  const columns = [
    columnHelper.accessor("brand", {
      header: "Brand",
      enableSorting: true,
      cell: ({ getValue }) => (
        <Text className="font-medium">{getValue()}</Text>
      ),
    }),
    columnHelper.accessor("model", {
      header: "Model",
      enableSorting: true,
      cell: ({ getValue }) => (
        <Text>{getValue()}</Text>
      ),
    }),
    columnHelper.accessor("serial_number", {
      header: "Serial Number",
      cell: ({ getValue }) => (
        <Text className="font-mono text-sm">{getValue()}</Text>
      ),
    }),
    columnHelper.accessor("fuel_type", {
      header: "Fuel Type",
      cell: ({ getValue }) => (
        <Text className="capitalize">{getValue()}</Text>
      ),
    }),
    columnHelper.accessor("year", {
      header: "Year",
      enableSorting: true,
      cell: ({ getValue }) => (
        <Text>{getValue()}</Text>
      ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ getValue }) => getStatusBadge(getValue()),
    }),
    columnHelper.accessor("location", {
      header: "Location",
      cell: ({ getValue }) => (
        <Text>{getValue() || "—"}</Text>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => <MachineActions machine={row.original} />,
    }),
  ]

  // Table instance - following official pattern
  const table = useDataTable({
    data: machines,
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
          <Heading>Machines</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Manage your equipment and machinery ({count} machines)
          </Text>
        </div>
        <CreateMachineForm />
      </div>
      <DataTable instance={table}>
        <DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
          <div className="flex gap-2">
            <DataTable.Search placeholder="Search machines..." />
          </div>
        </DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>
    </Container>
  )
}

// Main machines page component
const MachinesPage = () => {
  return <MachinesListTable />
}

export default MachinesPage
