import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { INVENTORY_LOCATION_MODULE } from "../../../../../modules/inventory_location"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id: productId } = req.params
  
  try {
    // Haal product service op
    const productModuleService = req.scope.resolve(Modules.PRODUCT)
    const inventoryModuleService = req.scope.resolve(Modules.INVENTORY)
    const inventoryLocationService = req.scope.resolve(INVENTORY_LOCATION_MODULE)
    
    // Haal product en variants op
    const product = await productModuleService.retrieveProduct(productId, {
      relations: ["variants"]
    })
    
    if (!product) {
      return res.status(404).json({ error: "Product not found" })
    }
    
    // Haal alle warehouse locations op
    const warehouseLocations = await inventoryLocationService.listInventoryLocations({
      is_active: true
    })
    
    // Voor elke variant, haal inventory items op
    const variantInventoryData = []
    
    for (const variant of product.variants || []) {
      try {
        // Haal inventory items voor deze variant op
        const inventoryItems = await inventoryModuleService.listInventoryItems({
          variant_id: variant.id
        })
        
        // Voor elke warehouse location, check of er inventory is
        const locationInventory = []
        for (const location of warehouseLocations) {
          const locationItems = await inventoryLocationService.listInventoryLocationItems({
            location_id: location.id
          })
          
          // Filter items die bij deze variant horen
          const variantLocationItems = locationItems.filter(item => 
            inventoryItems.some(invItem => invItem.id === item.inventory_item_id)
          )
          
          if (variantLocationItems.length > 0) {
            const totalQuantity = variantLocationItems.reduce((sum, item) => sum + (item.quantity || 0), 0)
            const reservedQuantity = variantLocationItems.reduce((sum, item) => sum + (item.reserved_quantity || 0), 0)
            
            locationInventory.push({
              location: location,
              quantity: totalQuantity,
              available: totalQuantity - reservedQuantity,
              reserved: reservedQuantity,
              items: variantLocationItems
            })
          }
        }
        
        variantInventoryData.push({
          variant: variant,
          locations: locationInventory
        })
      } catch (error) {
        console.error(`Error processing variant ${variant.id}:`, error)
        variantInventoryData.push({
          variant: variant,
          locations: [],
          error: error.message
        })
      }
    }
    
    res.json({
      product: product,
      warehouse_locations: warehouseLocations,
      variant_inventory: variantInventoryData
    })
    
  } catch (error) {
    console.error("Error fetching product inventory locations:", error)
    res.status(500).json({ 
      error: "Failed to fetch inventory locations",
      details: error.message 
    })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id: productId } = req.params
  const { variant_id, location_id, quantity } = req.body
  
  try {
    const inventoryModuleService = req.scope.resolve(Modules.INVENTORY)
    const inventoryLocationService = req.scope.resolve(INVENTORY_LOCATION_MODULE)
    
    // Haal inventory items voor variant op
    const inventoryItems = await inventoryModuleService.listInventoryItems({
      variant_id: variant_id
    })
    
    if (inventoryItems.length === 0) {
      return res.status(404).json({ error: "No inventory items found for variant" })
    }
    
    // Neem het eerste inventory item (normaal is er maar 1 per variant)
    const inventoryItem = inventoryItems[0]
    
    // Maak of update inventory location item
    const locationItem = await inventoryLocationService.createInventoryLocationItems({
      location_id: location_id,
      inventory_item_id: inventoryItem.id,
      quantity: quantity || 0,
      reserved_quantity: 0
    })
    
    res.json({
      success: true,
      location_item: locationItem
    })
    
  } catch (error) {
    console.error("Error updating inventory location:", error)
    res.status(500).json({ 
      error: "Failed to update inventory location",
      details: error.message 
    })
  }
} 