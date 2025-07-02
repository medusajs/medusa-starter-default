import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Table, Badge, Button, Heading } from "@medusajs/ui"
import { useState, useEffect } from "react"

const ProductInventoryLocationWidget = ({ data }: { data: any }) => {
  const [inventoryByLocation, setInventoryByLocation] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (data?.product?.variants) {
      fetchInventoryByLocation()
    }
  }, [data])

  const fetchInventoryByLocation = async () => {
    try {
      // Fetch all locations
      const locationsResponse = await fetch("/admin/inventory-locations", {
        credentials: "include",
      })
      const locationsData = await locationsResponse.json()
      const locations = locationsData.inventory_locations || []

      // Voor elke locatie, haal inventory items op
      const inventoryPromises = locations.map(async (location: any) => {
        try {
          const inventoryResponse = await fetch(`/admin/inventory-locations/${location.id}/inventory`, {
            credentials: "include",
          })
          const inventoryData = await inventoryResponse.json()
          return {
            ...location,
            inventory_items: inventoryData.inventory_items || []
          }
        } catch (error) {
          console.error(`Error fetching inventory for location ${location.id}:`, error)
          return {
            ...location,
            inventory_items: []
          }
        }
      })

      const locationsWithInventory = await Promise.all(inventoryPromises)
      setInventoryByLocation(locationsWithInventory)
    } catch (error) {
      console.error("Error fetching inventory by location:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-4">Loading inventory locations...</div>
  }

  const getTotalQuantityForLocation = (location: any) => {
    return location.inventory_items.reduce((total: number, item: any) => {
      return total + (item.quantity || 0)
    }, 0)
  }

  const getAvailableQuantityForLocation = (location: any) => {
    return location.inventory_items.reduce((total: number, item: any) => {
      return total + ((item.quantity || 0) - (item.reserved_quantity || 0))
    }, 0)
  }

  return (
    <Container>
      <div className="p-6">
        <Heading level="h3" className="mb-4">Warehouse Inventory Locations</Heading>
        
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Bin Location</Table.HeaderCell>
              <Table.HeaderCell>Warehouse</Table.HeaderCell>
              <Table.HeaderCell>Total Stock</Table.HeaderCell>
              <Table.HeaderCell>Available</Table.HeaderCell>
              <Table.HeaderCell>Reserved</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Actions</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {inventoryByLocation.map((location: any) => {
              const totalQuantity = getTotalQuantityForLocation(location)
              const availableQuantity = getAvailableQuantityForLocation(location)
              const reservedQuantity = totalQuantity - availableQuantity

              return (
                <Table.Row key={location.id}>
                  <Table.Cell>
                    <div className="font-medium">{location.name}</div>
                    <div className="text-sm text-gray-500">
                      {location.description}
                    </div>
                  </Table.Cell>
                  <Table.Cell>{location.warehouse_id || "-"}</Table.Cell>
                  <Table.Cell>
                    <span className="font-medium">{totalQuantity}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className={totalQuantity > 0 ? "text-green-600 font-medium" : "text-gray-500"}>
                      {availableQuantity}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className={reservedQuantity > 0 ? "text-orange-600" : "text-gray-500"}>
                      {reservedQuantity}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge variant={location.is_active ? "green" : "red"}>
                      {location.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="small">
                        Adjust
                      </Button>
                      <Button variant="ghost" size="small">
                        Move
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table>

        {inventoryByLocation.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No warehouse locations configured</p>
            <Button variant="primary">
              Setup Warehouse Locations
            </Button>
          </div>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductInventoryLocationWidget 