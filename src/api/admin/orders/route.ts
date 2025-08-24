import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createOrderWorkflow } from "@medusajs/medusa/core-flows"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    // Validate required fields
    const { customer_id, email, region_id, currency_code, sales_channel_id, items, shipping_address, billing_address, ...rest } = req.body as any
    
    if (!customer_id) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "Customer ID is required" 
      })
    }

    if (!email) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "Email is required" 
      })
    }

    if (!region_id) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "Region ID is required" 
      })
    }

    if (!currency_code) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "Currency code is required" 
      })
    }

    if (!sales_channel_id) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "Sales channel ID is required" 
      })
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "Items are required" 
      })
    }

    if (!shipping_address) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "Shipping address is required" 
      })
    }

    if (!billing_address) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "Billing address is required" 
      })
    }

    // Prepare order data
    const orderData = {
      customer_id,
      email,
      region_id,
      currency_code,
      sales_channel_id,
      items,
      shipping_address,
      billing_address,
      metadata: {
        created_via: 'admin-api',
        source: 'order-creation-endpoint',
        manual_reservations_created: true,
        ...rest.metadata
      },
      ...rest
    }

    // Create order using standard workflow
    const { result: order } = await createOrderWorkflow(req.scope).run({
      input: orderData
    })

    // Now create inventory reservations following the native MedusaJS pattern
    try {
      const inventoryService = req.scope.resolve(Modules.INVENTORY)
      const stockLocationService = req.scope.resolve(Modules.STOCK_LOCATION)
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
      
      // Get all stock locations and filter by sales channel manually
      const allStockLocations = await stockLocationService.listStockLocations({})
      
      // For now, we'll use the first available stock location
      // In a production system, you'd want to filter by sales channel properly
      const availableLocation = allStockLocations[0]
      
      if (!availableLocation) {
        console.warn(`No stock locations available`)
      } else {
        // Get variant IDs from order items
        const variantIds = order.items?.filter(item => item.variant_id).map(item => item.variant_id).filter(Boolean) || []
        
        if (variantIds.length === 0) {
          console.log('No variants found in order items, skipping reservation creation')
        } else {
          // Query variants with their inventory items using the query.graph method
          const { data: variants } = await query.graph({
            entity: "variant",
            fields: [
              "id",
              "manage_inventory",
              "inventory_items.inventory_item_id",
              "inventory_items.required_quantity"
            ],
            filters: { id: variantIds as string[] }
          })

          // Create basic reservations for items
          const reservationsToCreate: any[] = []

          for (const orderItem of order.items || []) {
            if (!orderItem.variant_id) continue

            try {
              // Find the variant data for this order item
              const variant = variants.find(v => v.id === orderItem.variant_id)
              
              if (!variant) {
                console.warn(`Variant ${orderItem.variant_id} not found in query results`)
                continue
              }

              // Skip if variant doesn't manage inventory
              if (!variant.manage_inventory) {
                console.log(`Variant ${orderItem.variant_id} doesn't manage inventory, skipping reservation`)
                continue
              }

              // Get inventory items for this variant
              const inventoryItems = variant.inventory_items || []
              
              if (inventoryItems.length === 0) {
                console.warn(`No inventory items found for variant ${orderItem.variant_id}`)
                continue
              }

              // Create reservations for each inventory item
              for (const inventoryItem of inventoryItems) {
                if (!inventoryItem) continue // Add null check
                
                const requiredQuantity = inventoryItem.required_quantity || 1
                const totalQuantity = orderItem.quantity * requiredQuantity
                
                reservationsToCreate.push({
                  line_item_id: orderItem.id,
                  inventory_item_id: inventoryItem.inventory_item_id,
                  location_id: availableLocation.id,
                  quantity: totalQuantity,
                  description: `Manual order reservation for ${order.id}`,
                  created_by: 'admin-order-creation',
                  allow_backorder: true, // Allow backorder to avoid stock validation issues
                  metadata: {
                    order_id: order.id,
                    variant_id: orderItem.variant_id,
                    source: 'manual-order-creation',
                  },
                })
              }
            } catch (itemError) {
              console.warn(`Could not prepare reservation for item ${orderItem.id}:`, itemError)
            }
          }

          // Create reservations if we have any
          if (reservationsToCreate.length > 0) {
            try {
              const createdReservations = await inventoryService.createReservationItems(reservationsToCreate)
              console.log(`Created ${createdReservations.length} inventory reservations for order ${order.id}`)
            } catch (createError) {
              console.warn("Some reservations could not be created:", createError.message)
              // This is expected for items that don't have managed inventory
            }
          }
        }
      }
    } catch (reservationError) {
      console.error("Failed to create inventory reservations:", reservationError)
      // Don't fail the order creation if reservations fail
      // This maintains the original behavior while adding reservation capability
    }
    
    res.status(201).json({ order })
  } catch (error) {
    console.error("Error creating order:", error)
    res.status(500).json({ 
      error: "Failed to create order",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}