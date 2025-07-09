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
  Table,
  toast
} from "@medusajs/ui"
import { useSearchParams, useNavigate } from "react-router-dom"
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

// Fetch machines
const fetchMachines = async (params: URLSearchParams) => {
  const searchParams = new URLSearchParams()
  
  // Add all params to search
  for (const [key, value] of params.entries()) {
    searchParams.append(key, value)
  }
  
  const response = await fetch(`/admin/machines?${searchParams.toString()}`)
  if (!response.ok) {
    throw new Error('Failed to fetch machines')
  }
  return response.json()
}

// Delete machine mutation
const useDeleteMachine = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (machineId: string) => {
      const response = await fetch(`/admin/machines/${machineId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete machine')
      }
      
      return response.json()
    },
    onSuccess: () => {
      toast.success('Machine deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['machines'] })
    },
    onError: () => {
      toast.error('Failed to delete machine')
    },
  })
}

// Define route config
export const config = defineRouteConfig({
  label: "Machines",
  icon: Tools,
})

const MachinesList = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const deleteMachineMutation = useDeleteMachine()
  
  // Get machines data
  const { data, isLoading, error } = useQuery({
    queryKey: ['machines', searchParams.toString()],
    queryFn: () => fetchMachines(searchParams),
  })

  const machines = data?.machines || []
  const count = data?.count || 0

  // Status badge helper
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: "green", label: "Active" },
      inactive: { color: "red", label: "Inactive" },
      maintenance: { color: "orange", label: "Maintenance" },
      sold: { color: "grey", label: "Sold" },
    } as const

    const config = statusConfig[status as keyof typeof statusConfig] || { color: "grey", label: status }
    
    return (
      <Badge size="2xsmall">
        {config.label}
      </Badge>
    )
  }

  if (error) {
    return (
      <Container className="p-6">
        <div className="text-center">
          <Text className="text-ui-fg-error">Failed to load machines</Text>
        </div>
      </Container>
    )
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex-1 overflow-hidden">
        <Container className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-base">
            <div>
              <Heading level="h1">Machines</Heading>
              <Text className="text-ui-fg-subtle">
                Manage your machine fleet ({count} machines)
              </Text>
            </div>
            <CreateMachineForm />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Text>Loading machines...</Text>
              </div>
            ) : machines.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Tools className="h-12 w-12 text-ui-fg-muted mb-4" />
                <Heading level="h2" className="mb-2">No machines found</Heading>
                <Text className="text-ui-fg-subtle mb-6">
                  Get started by creating your first machine.
                </Text>
                <CreateMachineForm />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.HeaderCell>Machine</Table.HeaderCell>
                      <Table.HeaderCell>Year</Table.HeaderCell>
                      <Table.HeaderCell>Status</Table.HeaderCell>
                      <Table.HeaderCell>Hours</Table.HeaderCell>
                      <Table.HeaderCell>Location</Table.HeaderCell>
                      <Table.HeaderCell>Fuel</Table.HeaderCell>
                      <Table.HeaderCell>Actions</Table.HeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {machines.map((machine: any) => {
                      // Map new field names to old field names for compatibility
                      const mappedMachine: Machine = {
                        ...machine,
                        brand: machine.name || '', // Map name to brand for compatibility
                        model: machine.model_number || '', // Map model_number to model
                      }
                      
                      return (
                        <Table.Row key={machine.id}>
                          <Table.Cell>
                            <div className="flex flex-col">
                              <Text weight="plus" size="small">{machine.name || machine.brand}</Text>
                              <Text size="xsmall" className="text-ui-fg-subtle">
                                {machine.model_number || machine.model} • {machine.serial_number}
                              </Text>
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                            <Text size="small">{machine.year || "—"}</Text>
                          </Table.Cell>
                          <Table.Cell>
                            {getStatusBadge(machine.status)}
                          </Table.Cell>
                          <Table.Cell>
                            <Text size="small">
                              {machine.engine_hours ? `${machine.engine_hours}h` : "—"}
                            </Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Text size="small">{machine.location || "—"}</Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Text size="small" className="capitalize">
                              {machine.fuel_type || "—"}
                            </Text>
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex items-center gap-1">
                              <IconButton 
                                size="small"
                                variant="transparent"
                                onClick={() => navigate(`/machines/${machine.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </IconButton>
                              <EditMachineForm machine={mappedMachine} trigger={
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
                                onClick={() => {
                                  if (window.confirm('Are you sure you want to delete this machine?')) {
                                    deleteMachineMutation.mutate(machine.id)
                                  }
                                }}
                                disabled={deleteMachineMutation.isPending}
                              >
                                <Trash className="h-4 w-4" />
                              </IconButton>
                            </div>
                          </Table.Cell>
                        </Table.Row>
                      )
                    })}
                  </Table.Body>
                </Table>
              </div>
            )}
          </div>
        </Container>
      </div>
    </div>
  )
}

export default MachinesList
