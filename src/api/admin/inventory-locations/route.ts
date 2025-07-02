import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INVENTORY_LOCATION_MODULE } from "../../../modules/inventory-location"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const inventoryLocationService = req.scope.resolve(INVENTORY_LOCATION_MODULE)
  
  const locations = await inventoryLocationService.listInventoryLocations()
  
  res.json({
    inventory_locations: locations,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const inventoryLocationService = req.scope.resolve(INVENTORY_LOCATION_MODULE)
  
  const { name, warehouse_id, description, is_active = true } = req.body
  
  const location = await inventoryLocationService.createInventoryLocations({
    name,
    warehouse_id,
    description,
    is_active,
  })
  
  res.json({
    inventory_location: location,
  })
} 