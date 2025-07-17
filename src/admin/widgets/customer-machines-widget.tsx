import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useQuery } from "@tanstack/react-query"
import {
  Container,
  Heading,
  Button,
  Text,
  Badge,
  Table,
} from "@medusajs/ui"
import { Plus, Tools, Eye } from "@medusajs/icons"
import { Link } from "react-router-dom"
import { CreateMachineForm } from "../components/machines/create-machine-form"

interface Customer {
  id: string
  email?: string
  first_name?: string
  last_name?: string
}

interface WidgetProps {
  data: Customer
}

// Fetch machines for customer
const fetchCustomerMachines = async (customerId: string) => {
  const response = await fetch(`/admin/machines?customer_id=${customerId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch customer machines')
  }
  const data = await response.json()
  return data.machines || []
}

const CustomerMachinesWidget = ({ data: customer }: WidgetProps) => {
  const { data: machines = [], isLoading, error } = useQuery({
    queryKey: ['customer-machines', customer.id],
    queryFn: () => fetchCustomerMachines(customer.id),
  })

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

  if (isLoading) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Machines</Heading>
        </div>
        <div className="px-6 py-8 text-center">
          <Text>Loading machines...</Text>
        </div>
      </Container>
    )
  }

  if (error) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Machines</Heading>
        </div>
        <div className="px-6 py-8 text-center">
          <Text className="text-ui-fg-error">Failed to load machines</Text>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Machines</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {machines.length} machine{machines.length !== 1 ? 's' : ''} linked to this customer
          </Text>
        </div>
        <CreateMachineForm onSuccess={() => {
          // The query will be invalidated automatically by the form
        }} />
      </div>
      
      {machines.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <Tools className="h-8 w-8 mx-auto text-ui-fg-muted mb-2" />
          <Text className="text-ui-fg-muted">No machines linked to this customer</Text>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            Add a machine to track equipment and service history
          </Text>
        </div>
      ) : (
        <div className="px-6">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Machine</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Hours</Table.HeaderCell>
                <Table.HeaderCell>Location</Table.HeaderCell>
                <Table.HeaderCell>Actions</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {machines.map((machine: any) => (
                <Table.Row key={machine.id}>
                  <Table.Cell>
                    <div className="flex flex-col">
                      <Text weight="plus" size="small">{machine.brand_name || 'Unknown Brand'}</Text>
                      <Text size="xsmall" className="text-ui-fg-subtle">
                        {machine.model_number} • {machine.serial_number}
                      </Text>
                    </div>
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
                    <div className="flex items-center gap-1">
                      <Button 
                        size="small" 
                        variant="transparent"
                        asChild
                      >
                        <Link to={`/machines/${machine.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "customer.details.after",
})

export default CustomerMachinesWidget 