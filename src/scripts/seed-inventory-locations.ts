import { ExecArgs } from "@medusajs/framework/types"
import { INVENTORY_LOCATION_MODULE } from "../modules/inventory-location"

export default async function seedInventoryLocations({ container }: ExecArgs) {
  const inventoryLocationService = container.resolve(INVENTORY_LOCATION_MODULE)

  console.log("Seeding inventory locations...")

  const locations = [
    {
      name: "Aisle 1, Bin A1",
      warehouse_id: "MAIN-WH",
      description: "Front section, hydraulic parts",
      is_active: true,
    },
    {
      name: "Aisle 1, Bin A2",
      warehouse_id: "MAIN-WH", 
      description: "Front section, engine parts",
      is_active: true,
    },
    {
      name: "Aisle 2, Bin B1",
      warehouse_id: "MAIN-WH",
      description: "Middle section, transmission parts",
      is_active: true,
    },
    {
      name: "Aisle 2, Bin B2", 
      warehouse_id: "MAIN-WH",
      description: "Middle section, electrical components",
      is_active: true,
    },
    {
      name: "Aisle 3, Bin C1",
      warehouse_id: "MAIN-WH",
      description: "Back section, body parts and accessories",
      is_active: true,
    },
    {
      name: "Outside Storage Area",
      warehouse_id: "MAIN-WH",
      description: "Large parts storage outside",
      is_active: true,
    },
    {
      name: "Workshop - Temporary",
      warehouse_id: "MAIN-WH",
      description: "Temporary storage during repairs",
      is_active: true,
    },
    {
      name: "Quarantine Area",
      warehouse_id: "MAIN-WH",
      description: "Parts awaiting inspection or return",
      is_active: false,
    },
  ]

  for (const locationData of locations) {
    try {
      const location = await inventoryLocationService.createInventoryLocations(locationData)
      console.log(`Created location: ${location.name}`)
    } catch (error) {
      console.error(`Error creating location ${locationData.name}:`, error)
    }
  }

  console.log("Inventory locations seeding completed!")
} 