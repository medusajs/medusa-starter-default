import React, { useState, useEffect } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { 
  Container, 
  Heading, 
  Button, 
  Badge, 
  Text, 
  Table,
  IconButton,
  DropdownMenu,
  toast
} from "@medusajs/ui"
import { 
  Plus, 
  EllipsisHorizontal, 
  Eye, 
  PencilSquare, 
  Tools 
} from "@medusajs/icons"
import { Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { DetailWidgetProps } from "@medusajs/framework/types"

interface Machine {
  id: string
  name: string
  model_number: string
  serial_number: string
  year?: number
  status: "active" | "inactive" | "maintenance" | "sold"
  location?: string
  created_at: string
  updated_at: string
}

interface Customer {
  id: string
  email: string
  first_name?: string
  last_name?: string
  company_name?: string
}

const CustomerMachinesWidget = ({ data: customer }: DetailWidgetProps<Customer>) => {
  const queryClient = useQueryClient()

  // Fetch machines for this customer
  const { 
    data: machinesData, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ["customer-machines", customer.id],
    queryFn: async () => {
      const response = await fetch(`/admin/machines?customer_id=${customer.id}&limit=50`)
      if (!response.ok) {
        throw new Error("Failed to fetch machines")
      }
      return response.json()
    },
  })

  const machines = machinesData?.machines || []

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "green"
      case "maintenance":
        return "orange"
      case "inactive":
        return "grey"
      case "sold":
        return "red"
      default:
        return "grey"
    }
  }

  // Format status text
  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  if (isLoading) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Machines</Heading>
        </div>
        <div className="px-6 py-4">
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
        <div className="px-6 py-4">
          <Text className="text-ui-fg-error">Error loading machines</Text>
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
        <Button 
          size="small" 
          variant="secondary"
          asChild
        >
          <Link to={`/machines/create?customer_id=${customer.id}`}>
            <Plus className="h-4 w-4" />
            Add Machine
          </Link>
        </Button>
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
        <div className="px-6 pb-4">
          <div className="space-y-3">
            {machines.slice(0, 5).map((machine: Machine) => (
              <div 
                key={machine.id} 
                className="flex items-center justify-between p-3 bg-ui-bg-subtle rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Text weight="plus" size="small" className="truncate">
                      {machine.name}
                    </Text>
                    <Badge color={getStatusColor(machine.status)} size="small">
                      {formatStatus(machine.status)}
                    </Badge>
                  </div>
                  <Text size="small" className="text-ui-fg-subtle">
                    {machine.model_number} • {machine.serial_number}
                  </Text>
                  {machine.location && (
                    <Text size="small" className="text-ui-fg-muted">
                      📍 {machine.location}
                    </Text>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenu.Trigger asChild>
                    <IconButton variant="transparent" size="small">
                      <EllipsisHorizontal />
                    </IconButton>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content>
                    <DropdownMenu.Item asChild>
                      <Link to={`/machines/${machine.id}`}>
                        <Eye className="h-4 w-4" />
                        View Details
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                      <Link to={`/machines/${machine.id}/edit`}>
                        <PencilSquare className="h-4 w-4" />
                        Edit Machine
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item asChild>
                      <Link to={`/service-orders/create?machine_id=${machine.id}`}>
                        <Tools className="h-4 w-4" />
                        Create Service Order
                      </Link>
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu>
              </div>
            ))}
          </div>
          
          {machines.length > 5 && (
            <div className="mt-4 pt-3 border-t border-ui-border-base">
              <Button variant="secondary" size="small" className="w-full" asChild>
                <Link to={`/machines?customer_id=${customer.id}`}>
                  View All {machines.length} Machines
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </Container>
  )
}

// Widget configuration - inject into customer details sidebar
export const config = defineWidgetConfig({
  zone: "customer.details.side.after",
})

export default CustomerMachinesWidget 