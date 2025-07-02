import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Table, Badge, Button } from "@medusajs/ui"
import { useState, useEffect } from "react"

const InventoryLocationWidget = ({ data }: { data: any }) => {
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInventoryLocations()
  }, [])

  const fetchInventoryLocations = async () => {
    try {
      const response = await fetch("/admin/inventory-locations", {
        credentials: "include",
      })
      const result = await response.json()
      setLocations(result.inventory_locations || [])
    } catch (error) {
      console.error("Error fetching inventory locations:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-4">Loading warehouse locations...</div>
  }

  return (
    <Container>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Warehouse Bin Locations</h3>
          <Button variant="secondary" size="small">
            Manage Locations
          </Button>
        </div>

        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Bin Location</Table.HeaderCell>
              <Table.HeaderCell>Warehouse</Table.HeaderCell>
              <Table.HeaderCell>Description</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Items</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {locations.map((location: any) => (
              <Table.Row key={location.id}>
                <Table.Cell>
                  <div className="font-medium">{location.name}</div>
                </Table.Cell>
                <Table.Cell>{location.warehouse_id || "-"}</Table.Cell>
                <Table.Cell>
                  <div className="text-sm text-gray-600">
                    {location.description || "No description"}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <Badge variant={location.is_active ? "green" : "red"}>
                    {location.is_active ? "Active" : "Inactive"}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Button variant="ghost" size="small">
                    View Items
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>

        {locations.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No warehouse locations configured</p>
            <Button variant="primary">
              Add First Location
            </Button>
          </div>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "inventory.list.before",
})

export default InventoryLocationWidget 