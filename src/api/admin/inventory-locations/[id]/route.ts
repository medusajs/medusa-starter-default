import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INVENTORY_LOCATION_MODULE } from "../../../../modules/inventory_location"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const inventoryLocationService = req.scope.resolve(INVENTORY_LOCATION_MODULE)
  const { id } = req.params
  
  const location = await inventoryLocationService.retrieveInventoryLocation(id)
  
  res.json({
    inventory_location: location,
  })
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const inventoryLocationService = req.scope.resolve(INVENTORY_LOCATION_MODULE)
  const { id } = req.params
  
  const location = await inventoryLocationService.updateInventoryLocations(id, req.body)
  
  res.json({
    inventory_location: location,
  })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const inventoryLocationService = req.scope.resolve(INVENTORY_LOCATION_MODULE)
  const { id } = req.params
  
  await inventoryLocationService.deleteInventoryLocations(id)
  
  res.json({
    id,
    deleted: true,
  })
} 