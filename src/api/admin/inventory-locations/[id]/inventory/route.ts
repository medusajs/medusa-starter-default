import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INVENTORY_LOCATION_MODULE } from "../../../../../modules/inventory_location"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const inventoryLocationService = req.scope.resolve(INVENTORY_LOCATION_MODULE)
  const { id } = req.params
  
  const inventory = await inventoryLocationService.listInventoryLocationItems({
    location_id: id
  })
  
  res.json({
    inventory_items: inventory,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const inventoryLocationService = req.scope.resolve(INVENTORY_LOCATION_MODULE)
  const { id } = req.params
  const { inventory_item_id, quantity } = req.body
  
  const inventoryItem = await inventoryLocationService.createInventoryLocationItems({
    location_id: id,
    inventory_item_id,
    quantity,
  })
  
  res.json({
    inventory_item: inventoryItem,
  })
} 