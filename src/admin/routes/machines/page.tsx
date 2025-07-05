import React from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Plus, Eye, PencilSquare, Trash, MagnifyingGlass, AdjustmentsHorizontal } from "@medusajs/icons"
import { Container, Heading, Button, Table, Badge, IconButton, Text, Input } from "@medusajs/ui"
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
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Machines</Heading>
        </div>
        <div className="px-6 py-4">
          <Text className="text-ui-fg-error">
            Failed to load machines. Please try again.
          </Text>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-x-2">
          <Heading level="h2">Machines</Heading>
        </div>
        <div className="flex items-center gap-x-2">
          <Button variant="secondary" size="small">
            <AdjustmentsHorizontal className="w-4 h-4" />
            Filters
          </Button>
          <Button variant="primary" size="small" asChild>
            <Link to="/app/machines/new">
              <Plus className="w-4 h-4" />
              Add Machine
            </Link>
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-x-2 px-6 py-4">
        <div className="flex w-full max-w-sm items-center gap-x-2">
          <div className="relative flex-1">
            <MagnifyingGlass className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-fg-muted" />
            <Input
              placeholder="Search machines..."
              className="pl-8"
              size="small"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden">
        <Table>
          <Table.Header className="border-t-0">
            <Table.Row className="[&_th]:h-12">
              <Table.HeaderCell>Brand</Table.HeaderCell>
              <Table.HeaderCell>Model</Table.HeaderCell>
              <Table.HeaderCell>Serial Number</Table.HeaderCell>
              <Table.HeaderCell>Year</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Location</Table.HeaderCell>
              <Table.HeaderCell className="w-[100px]">Actions</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body className="border-b-0">
            {isLoading ? (
              <Table.Row>
                <Table.Cell colSpan={7} className="h-24 text-center">
                  <Text className="text-ui-fg-subtle">Loading machines...</Text>
                </Table.Cell>
              </Table.Row>
            ) : machines.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={7} className="h-24 text-center">
                  <Text className="text-ui-fg-subtle">No machines found</Text>
                </Table.Cell>
              </Table.Row>
            ) : (
              machines.map((machine: Machine) => (
                <Table.Row 
                  key={machine.id}
                  className="[&_td]:h-12 cursor-pointer hover:bg-ui-bg-subtle transition-colors"
                  onClick={() => window.location.href = `/app/machines?id=${machine.id}`}
                >
                  <Table.Cell>
                    <Text weight="plus" size="small">{machine.brand}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="small">{machine.model}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="small" className="font-mono">{machine.serial_number}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="small">{machine.year}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge 
                      variant={machine.status === "active" ? "green" : machine.status === "maintenance" ? "orange" : "red"}
                      size="2xsmall"
                    >
                      {machine.status}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="small" className="text-ui-fg-subtle">{machine.location || "-"}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-x-2">
                      <IconButton
                        variant="transparent"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.location.href = `/app/machines?id=${machine.id}`
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </IconButton>
                      <IconButton
                        variant="transparent"
                        size="small"
                        onClick={(e) => {
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
    </Container>
  )
}

// Machine Detail Component
const MachineDetail = ({ machineId }: { machineId: string }) => {
  const { data: machine, isLoading, error } = useMachine(machineId)

  if (isLoading) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Machine Details</Heading>
        </div>
        <div className="px-6 py-4">
          <Text>Loading machine details...</Text>
        </div>
      </Container>
    )
  }

  if (error || !machine) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Machine Details</Heading>
        </div>
        <div className="px-6 py-4">
          <Text className="text-ui-fg-error">
            Failed to load machine details. Please try again.
          </Text>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-x-4">
          <Button variant="transparent" size="small" asChild>
            <Link to="/app/machines">
              ← Back to Machines
            </Link>
          </Button>
          <div>
            <Heading level="h2">
              {machine.brand} {machine.model}
            </Heading>
            <Text className="text-ui-fg-subtle" size="small">
              Serial: {machine.serial_number}
            </Text>
          </div>
        </div>
        <div className="flex items-center gap-x-2">
          <Button variant="secondary" size="small" asChild>
            <Link to={`/app/machines/${machine.id}/edit`}>
              <PencilSquare className="w-4 h-4" />
              Edit
            </Link>
          </Button>
          <Button variant="danger" size="small">
            <Trash className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Machine Details Content */}
      <div className="px-6 py-6">
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
                <Text size="small" weight="plus" className="text-ui-fg-base mb-2">
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
    </Container>
  )
}

// Helper component for detail rows
const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div>
    <Text size="xsmall" weight="plus" className="text-ui-fg-base">
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
