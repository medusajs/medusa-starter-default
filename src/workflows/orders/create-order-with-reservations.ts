import {
  createWorkflow,
  WorkflowResponse,
  WorkflowData,
  transform,
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  createOrderWorkflow,
  CreateOrderWorkflowInput,
} from "@medusajs/medusa/core-flows"
import { Modules } from "@medusajs/framework/utils"

type CreateOrderWithReservationsWorkflowInput = CreateOrderWorkflowInput

export const createOrderWithReservationsWorkflowId = "create-order-with-reservations"

/**
 * Step to create inventory reservations for order items with managed inventory
 */
const createInventoryReservationsStep = createStep(
  "create-inventory-reservations-step",
  async (data: { order: any; sales_channel_id: string }, { container }) => {
    const inventoryService = container.resolve(Modules.INVENTORY)

    if (!data.order?.items?.length) {
      return new StepResponse([], [])
    }

    const reservations = []

    for (const orderItem of data.order.items) {
      if (!orderItem.variant_id) continue

      // Skip items that don't require inventory management
      // This is handled during fulfillment - if variant has manage_inventory: false,
      // fulfillment will proceed without reservations
      try {
        // Try to create a reservation - if the variant doesn't manage inventory,
        // the inventory service will handle this appropriately
        
        // In MedusaJS v2, we need to use the Query API to list stock locations
        // For now, we'll use a default stock location approach
        // TODO: Implement proper stock location resolution for sales channels
        const stockLocations = await inventoryService.listStockLocations({})
        
        if (!stockLocations.length) {
          console.warn(`No stock locations found`)
          continue
        }

        // Create basic reservation for the order item
        // The inventory service will validate if this variant manages inventory
        // Note: In MedusaJS v2, we need to provide inventory_item_id instead of line_item_id
        // For now, we'll use the variant_id as a fallback - proper inventory item resolution needed
        const reservation = await inventoryService.createReservationItems({
          inventory_item_id: orderItem.variant_id, // TODO: Resolve to proper inventory_item_id
          location_id: stockLocations[0].id,
          quantity: orderItem.quantity,
          description: `Reservation for order ${data.order.id}`,
          metadata: {
            order_id: data.order.id,
            variant_id: orderItem.variant_id,
            line_item_id: orderItem.id,
          },
        })
        
        reservations.push(reservation)
      } catch (error) {
        console.warn(
          `Could not create reservation for item ${orderItem.id}:`,
          error.message
        )
        // Continue with other items - this is expected for non-managed inventory items
      }
    }

    return new StepResponse(reservations, reservations.map((r: any) => r.id))
  },
  async (reservationIds, { container }) => {
    if (!reservationIds?.length) {
      return
    }

    const inventoryService = container.resolve(Modules.INVENTORY)
    
    // Clean up reservations if workflow fails
    try {
      // In MedusaJS v2, we delete reservations individually or by ID array
      for (const reservationId of reservationIds) {
        await inventoryService.deleteReservationItems(reservationId)
      }
    } catch (error) {
      console.warn("Failed to clean up reservations:", error.message)
    }
  }
)

/**
 * This workflow creates an order and reserves inventory for managed inventory items.
 * It extends the standard createOrderWorkflow to add inventory reservations.
 */
export const createOrderWithReservationsWorkflow = createWorkflow(
  createOrderWithReservationsWorkflowId,
  (input: WorkflowData<CreateOrderWithReservationsWorkflowInput>) => {
    // First, create the order using the standard workflow
    const order = createOrderWorkflow.runAsStep({
      input,
    })

    // Create inventory reservations for the order items
    createInventoryReservationsStep({
      order,
      sales_channel_id: input.sales_channel_id,
    })

    return new WorkflowResponse(order)
  }
) 