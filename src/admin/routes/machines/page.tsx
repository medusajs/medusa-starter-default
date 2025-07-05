import React from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Plus, Eye, PencilSquare, Trash } from "@medusajs/icons"
import { Container, Heading, Button, Table, Badge, IconButton, Text } from "@medusajs/ui"
import { Link, useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"

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
      const response = await fetch("/admin/machines")
      if (!response.ok) {
        throw new Error("Failed to fetch machines")
      }
      const data = await response.json()
      return data.machines || []
    },
  })
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

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Text className="text-ui-fg-error">
          Failed to load machines. Please try again.
        </Text>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col">
      {/* Main Content Card */}
      <div className="flex-1 overflow-hidden px-6 py-6">
        <div className="bg-ui-bg-base border border-ui-border-base rounded-lg overflow-hidden h-full flex flex-col">
          {/* Header inside card */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-base">
            <div>
              <Heading level="h1">Machines</Heading>
              <Text className="text-ui-fg-subtle">
                Manage your machine fleet
              </Text>
            </div>
            <Button variant="primary" size="small" asChild>
              <Link to="/app/machines/new">
                <Plus className="w-4 h-4 mr-2" />
                Aanmaken
              </Link>
            </Button>
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

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Brand</Table.HeaderCell>
                  <Table.HeaderCell>Model</Table.HeaderCell>
                  <Table.HeaderCell>Serial Number</Table.HeaderCell>
                  <Table.HeaderCell>Year</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Location</Table.HeaderCell>
                  <Table.HeaderCell className="w-[100px]">Actions</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {isLoading ? (
                  <Table.Row>
                    <Table.Cell colSpan={7} className="text-center py-8">
                      <Text className="text-ui-fg-subtle">Loading machines...</Text>
                    </Table.Cell>
                  </Table.Row>
                ) : machines.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={7} className="text-center py-8">
                      <Text className="text-ui-fg-subtle">No machines found</Text>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  machines.map((machine: Machine) => (
                    <Table.Row 
                      key={machine.id}
                      className="cursor-pointer hover:bg-ui-bg-subtle"
                      onClick={() => window.location.href = `/app/machines?id=${machine.id}`}
                    >
                      <Table.Cell>
                        <Text weight="medium">{machine.brand}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text>{machine.model}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text className="font-mono text-sm">{machine.serial_number}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text>{machine.year}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge 
                          variant={machine.status === "active" ? "green" : machine.status === "maintenance" ? "orange" : "red"}
                          size="small"
                        >
                          {machine.status}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Text>{machine.location || "-"}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex items-center gap-2">
                          <IconButton
                            variant="transparent"
                            size="small"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation()
                              window.location.href = `/app/machines?id=${machine.id}`
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </IconButton>
                          <IconButton
                            variant="transparent"
                            size="small"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation()
                              window.location.href = `/app/machines/${machine.id}/edit`
                            }}
                          >
                            <PencilSquare className="w-4 h-4" />
                          </IconButton>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ))
                )}
              </Table.Body>
            </Table>
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
          <Link to="/app/machines">
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
            <Button variant="secondary" size="small" asChild>
              <Link to={`/app/machines/${machine.id}/edit`}>
                <PencilSquare className="w-4 h-4 mr-2" />
                Edit
              </Link>
            </Button>
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
})

export default MachinesPage
