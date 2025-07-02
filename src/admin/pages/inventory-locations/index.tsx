import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Table } from "@medusajs/ui"
import { PlusIcon } from "@heroicons/react/24/outline"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"

const InventoryLocationsPage = () => {
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLocations()
  }, [])

  const fetchLocations = async () => {
    try {
      const response = await fetch("/admin/inventory-locations", {
        credentials: "include",
      })
      const data = await response.json()
      setLocations(data.inventory_locations || [])
    } catch (error) {
      console.error("Error fetching locations:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <Container>
      <div className="flex items-center justify-between mb-6">
        <Heading level="h1">Inventory Locations</Heading>
        <Link to="/admin/inventory-locations/create">
          <Button variant="primary">
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Location
          </Button>
        </Link>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.HeaderCell>Warehouse</Table.HeaderCell>
            <Table.HeaderCell>Description</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Actions</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {locations.map((location: any) => (
            <Table.Row key={location.id}>
              <Table.Cell>
                <Link 
                  to={`/admin/inventory-locations/${location.id}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {location.name}
                </Link>
              </Table.Cell>
              <Table.Cell>{location.warehouse_id || "-"}</Table.Cell>
              <Table.Cell>{location.description || "-"}</Table.Cell>
              <Table.Cell>
                <span 
                  className={`px-2 py-1 rounded text-xs ${
                    location.is_active 
                      ? "bg-green-100 text-green-800" 
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {location.is_active ? "Active" : "Inactive"}
                </span>
              </Table.Cell>
              <Table.Cell>
                <Link 
                  to={`/admin/inventory-locations/${location.id}`}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  View Details
                </Link>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>

      {locations.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No inventory locations found.</p>
          <Link to="/admin/inventory-locations/create">
            <Button variant="primary" className="mt-4">
              <PlusIcon className="w-4 h-4 mr-2" />
              Create Your First Location
            </Button>
          </Link>
        </div>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Inventory Locations",
  icon: "building-storefront",
})

export default InventoryLocationsPage 