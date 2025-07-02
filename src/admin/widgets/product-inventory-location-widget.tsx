import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Table, Badge, Button, Heading } from "@medusajs/ui"
import { useState, useEffect } from "react"

const ProductInventoryLocationWidget = ({ data }: { data: any }) => {
  const [inventoryByLocation, setInventoryByLocation] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (data?.product?.id) {
      fetchInventoryByLocation()
    }
  }, [data])

  const fetchInventoryByLocation = async () => {
    try {
      // Gebruik de nieuwe API endpoint voor product inventory locations
      const response = await fetch(`/admin/products/${data.product.id}/inventory-locations`, {
        credentials: "include",
      })
      
      if (response.ok) {
        const result = await response.json()
        setInventoryByLocation(result.variant_inventory || [])
      } else {
        // Fallback naar de oude methode
        await fetchInventoryByLocationFallback()
      }
    } catch (error) {
      console.error("Error fetching inventory by location:", error)
      await fetchInventoryByLocationFallback()
    } finally {
      setLoading(false)
    }
  }

  const fetchInventoryByLocationFallback = async () => {
    try {
      // Haal alle warehouse locations op
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
            variant: { title: "All Variants", sku: "-" },
            locations: [{
              location: location,
              quantity: inventoryData.inventory_items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0,
              available: inventoryData.inventory_items?.reduce((sum: number, item: any) => sum + ((item.quantity || 0) - (item.reserved_quantity || 0)), 0) || 0,
              reserved: inventoryData.inventory_items?.reduce((sum: number, item: any) => sum + (item.reserved_quantity || 0), 0) || 0,
            }]
          }
        } catch (error) {
          console.error(`Error fetching inventory for location ${location.id}:`, error)
          return {
            variant: { title: "All Variants", sku: "-" },
            locations: []
          }
        }
      })

      const locationsWithInventory = await Promise.all(inventoryPromises)
      setInventoryByLocation(locationsWithInventory)
    } catch (error) {
      console.error("Error in fallback inventory fetch:", error)
    }
  }

  if (loading) {
    return <div className="p-4">Loading warehouse inventory locations...</div>
  }

  return (
    <Container>
      <div className="p-6">
        <Heading level="h3" className="mb-4">Warehouse Bin Locations</Heading>
        
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Tractorgarage ERP:</strong> Warehouse bin locations voor nauwkeurige onderdelen tracking. 
            Gebruik specifieke bin locaties zoals "Aisle 2, Bin B2" in plaats van algemene filialen.
          </p>
        </div>

        {inventoryByLocation.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No warehouse locations configured</p>
            <Button variant="primary">
              Setup Warehouse Locations
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {inventoryByLocation.map((variantData: any, index: number) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="mb-3">
                  <h4 className="font-medium text-gray-900">{variantData.variant?.title || "Variant"}</h4>
                  {variantData.variant?.sku && (
                    <p className="text-sm text-gray-600">SKU: {variantData.variant.sku}</p>
                  )}
                </div>

                {variantData.locations && variantData.locations.length > 0 ? (
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
                      {variantData.locations.map((locationData: any, locIndex: number) => (
                        <Table.Row key={locIndex}>
                          <Table.Cell>
                            <div className="font-medium">{locationData.location?.name || "Unknown"}</div>
                            <div className="text-sm text-gray-500">
                              {locationData.location?.description || "No description"}
                            </div>
                          </Table.Cell>
                          <Table.Cell>{locationData.location?.warehouse_id || "-"}</Table.Cell>
                          <Table.Cell>
                            <span className="font-medium">{locationData.quantity || 0}</span>
                          </Table.Cell>
                          <Table.Cell>
                            <span className={(locationData.available || 0) > 0 ? "text-green-600 font-medium" : "text-gray-500"}>
                              {locationData.available || 0}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <span className={(locationData.reserved || 0) > 0 ? "text-orange-600" : "text-gray-500"}>
                              {locationData.reserved || 0}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge variant={locationData.location?.is_active ? "green" : "red"}>
                              {locationData.location?.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="small">
                                Adjust Stock
                              </Button>
                              <Button variant="ghost" size="small">
                                Move Parts
                              </Button>
                            </div>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table>
                ) : (
                  <p className="text-gray-500 text-sm">No inventory found in warehouse locations</p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Warehouse locations help track parts in specific bins like "Aisle 3, Bin C1" for better organization.
          </div>
          <div className="flex space-x-2">
            <Button variant="secondary" size="small">
              Configure Locations
            </Button>
            <Button variant="primary" size="small">
              Add to Location
            </Button>
          </div>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductInventoryLocationWidget 