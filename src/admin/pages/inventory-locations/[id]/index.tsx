import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Badge, Table } from "@medusajs/ui"
import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"

const InventoryLocationDetailPage = () => {
  const { id } = useParams()
  const [location, setLocation] = useState(null)
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchLocationData()
    }
  }, [id])

  const fetchLocationData = async () => {
    try {
      // Fetch location details
      const locationResponse = await fetch(`/admin/inventory-locations/${id}`, {
        credentials: "include",
      })
      const locationData = await locationResponse.json()
      setLocation(locationData.inventory_location)

      // Fetch inventory for this location
      const inventoryResponse = await fetch(`/admin/inventory-locations/${id}/inventory`, {
        credentials: "include",
      })
      const inventoryData = await inventoryResponse.json()
      setInventory(inventoryData.inventory_items || [])
    } catch (error) {
      console.error("Error fetching location data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!location) {
    return <div>Location not found</div>
  }

  return (
    <Container>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/admin/inventory-locations" className="text-blue-600 hover:text-blue-800 text-sm mb-2 block">
            ← Back to Inventory Locations
          </Link>
          <Heading level="h1">{location.name}</Heading>
        </div>
        <Badge variant={location.is_active ? "green" : "red"}>
          {location.is_active ? "Active" : "Inactive"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Location Details</h3>
          <div className="space-y-3">
            <div>
              <span className="font-medium">Name:</span>
              <span className="ml-2">{location.name}</span>
            </div>
            <div>
              <span className="font-medium">Warehouse ID:</span>
              <span className="ml-2">{location.warehouse_id || "Not assigned"}</span>
            </div>
            <div>
              <span className="font-medium">Description:</span>
              <span className="ml-2">{location.description || "No description"}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Inventory Summary</h3>
          <div className="space-y-3">
            <div>
              <span className="font-medium">Total Items:</span>
              <span className="ml-2">{inventory.length}</span>
            </div>
            <div>
              <span className="font-medium">Total Quantity:</span>
              <span className="ml-2">
                {inventory.reduce((sum, item) => sum + (item.quantity || 0), 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Inventory Items</h3>
            <Button variant="primary" size="small">
              Add Item
            </Button>
          </div>
        </div>

        {inventory.length > 0 ? (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Item ID</Table.HeaderCell>
                <Table.HeaderCell>Quantity</Table.HeaderCell>
                <Table.HeaderCell>Reserved</Table.HeaderCell>
                <Table.HeaderCell>Available</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {inventory.map((item: any) => (
                <Table.Row key={item.id}>
                  <Table.Cell>{item.inventory_item_id}</Table.Cell>
                  <Table.Cell>{item.quantity || 0}</Table.Cell>
                  <Table.Cell>{item.reserved_quantity || 0}</Table.Cell>
                  <Table.Cell>
                    {(item.quantity || 0) - (item.reserved_quantity || 0)}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        ) : (
          <div className="p-6 text-center">
            <p className="text-gray-500 mb-4">No inventory items at this location</p>
            <Button variant="primary">
              Add First Item
            </Button>
          </div>
        )}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Location Details",
})

export default InventoryLocationDetailPage 