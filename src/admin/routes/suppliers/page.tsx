import { useState, useEffect } from "react"
import { Container, Heading, Button, Table, Badge } from "@medusajs/ui"
import { PencilSquare, Trash, Plus, Users } from "@medusajs/icons"
import { useNavigate } from "react-router-dom"
import { defineRouteConfig } from "@medusajs/admin-sdk"

interface Supplier {
  id: string
  name: string
  code?: string
  email?: string
  phone?: string
  is_active: boolean
  created_at: Date
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/admin/suppliers')
      const data = await response.json()
      setSuppliers(data.suppliers || [])
    } catch (error) {
      console.error('Failed to fetch suppliers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this supplier?')) {
      try {
        await fetch(`/admin/suppliers/${id}`, { method: 'DELETE' })
        fetchSuppliers() // Refresh the list
      } catch (error) {
        console.error('Failed to delete supplier:', error)
      }
    }
  }

  if (loading) {
    return (
      <Container className="flex items-center justify-center min-h-96">
        <div>Loading suppliers...</div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">Suppliers</Heading>
        <Button 
          variant="primary"
          onClick={() => navigate('/admin/suppliers/new')}
        >
          <Plus className="mr-2" />
          Add Supplier
        </Button>
      </div>
      
      <div className="px-6 py-4">
        {suppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Heading level="h3" className="mb-2">No suppliers found</Heading>
            <p className="text-gray-500 mb-4">Get started by adding your first supplier</p>
            <Button 
              variant="primary"
              onClick={() => navigate('/admin/suppliers/new')}
            >
              <Plus className="mr-2" />
              Add Supplier
            </Button>
          </div>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Name</Table.HeaderCell>
                <Table.HeaderCell>Code</Table.HeaderCell>
                <Table.HeaderCell>Contact</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Created</Table.HeaderCell>
                <Table.HeaderCell>Actions</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {suppliers.map((supplier) => (
                <Table.Row key={supplier.id}>
                  <Table.Cell>
                    <div className="font-medium">{supplier.name}</div>
                  </Table.Cell>
                  <Table.Cell>{supplier.code || '-'}</Table.Cell>
                  <Table.Cell>
                    <div className="space-y-1">
                      {supplier.email && <div>{supplier.email}</div>}
                      {supplier.phone && <div className="text-sm text-gray-500">{supplier.phone}</div>}
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={supplier.is_active ? "green" : "red"}>
                      {supplier.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    {new Date(supplier.created_at).toLocaleDateString()}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="transparent"
                        size="small"
                        onClick={() => navigate(`/admin/suppliers/${supplier.id}`)}
                      >
                        <PencilSquare />
                      </Button>
                      <Button
                        variant="transparent"
                        size="small"
                        onClick={() => handleDelete(supplier.id)}
                      >
                        <Trash />
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Suppliers",
  icon: Users,
}) 