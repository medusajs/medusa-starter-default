import { createStep, StepResponse } from "@medusajs/workflows-sdk"
import { ModuleRegistrationName } from "@medusajs/utils"
import { PURCHASING_MODULE } from "@/modules/purchasing"
import PurchasingService from "@/modules/purchasing/service"

// Custom type for our inventory update tracking
interface InventoryUpdateInput {
  inventory_item_id: string
  inventory_level_id: string
  quantity_added: number
  product_variant_id: string
  purchase_order_item_id: string
}

type UpdateInventoryStepInput = {
  purchase_order_id: string
  items: {
    purchase_order_item_id: string
    quantity_received: number
    received_date?: Date
    notes?: string
  }[]
}

export const updateInventoryStep = createStep(
  "update-inventory-step",
  async (input: UpdateInventoryStepInput, { container }) => {
    const purchasingService = container.resolve(
      PURCHASING_MODULE
    ) as PurchasingService

    const inventoryModule = container.resolve(ModuleRegistrationName.INVENTORY)
    
    const { purchase_order_id, items } = input
    const inventoryUpdates: InventoryUpdateInput[] = []

    // Get purchase order items to get product variant IDs
    for (const item of items) {
      try {
        const purchaseOrderItem = await purchasingService.retrievePurchaseOrderItem(
          item.purchase_order_item_id
        )

        if (purchaseOrderItem && item.quantity_received > 0) {
          // Update inventory for the product variant
          // Note: This assumes you have inventory levels set up for the product variants
          const inventoryItems = await inventoryModule.listInventoryItems({
            sku: purchaseOrderItem.product_sku ?? undefined,
          })

          if (inventoryItems.length > 0) {
            const inventoryItem = inventoryItems[0]
            
            // Get current inventory levels
            const inventoryLevels = await inventoryModule.listInventoryLevels({
              inventory_item_id: inventoryItem.id,
            })

            for (const level of inventoryLevels) {
              // Increase the stocked quantity
              await inventoryModule.updateInventoryLevels([{
                id: level.id,
                inventory_item_id: inventoryItem.id,
                location_id: (level as any).location_id,
                stocked_quantity: level.stocked_quantity + item.quantity_received,
              }])

              inventoryUpdates.push({
                inventory_item_id: inventoryItem.id,
                inventory_level_id: level.id,
                quantity_added: item.quantity_received,
                product_variant_id: purchaseOrderItem.product_variant_id,
                purchase_order_item_id: item.purchase_order_item_id,
              })
            }
          }
        }
      } catch (error) {
        console.error(`Failed to update inventory for item ${item.purchase_order_item_id}:`, error)
        // Continue with other items even if one fails
      }
    }

    return new StepResponse({ inventoryUpdates }, { 
      purchaseOrderId: purchase_order_id,
      inventoryUpdates 
    })
  },
  async (compensationInput, { container }) => {
    if (!compensationInput?.inventoryUpdates) {
      return
    }

    const inventoryModule = container.resolve(ModuleRegistrationName.INVENTORY)
    
    // Revert inventory updates
    for (const update of compensationInput.inventoryUpdates) {
      try {
        const level = await inventoryModule.retrieveInventoryLevel(update.inventory_level_id)
        await inventoryModule.updateInventoryLevels([{
          id: update.inventory_level_id,
          inventory_item_id: level.inventory_item_id,
          location_id: (level as any).location_id,
          stocked_quantity: Math.max(0, level.stocked_quantity - update.quantity_added),
        }])
      } catch (error) {
        console.error(`Failed to revert inventory update for level ${update.inventory_level_id}:`, error)
      }
    }
  }
) 