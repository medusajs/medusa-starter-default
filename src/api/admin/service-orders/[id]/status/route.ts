import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { SERVICE_ORDERS_MODULE } from "../../../../../modules/service-orders"

const VALID_STATUSES = [
  "draft", 
  "scheduled", 
  "in_progress", 
  "waiting_parts", 
  "customer_approval", 
  "completed", 
  "cancelled"
]

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    console.log("=== STATUS UPDATE ENDPOINT CALLED ===")
    const serviceOrdersService: any = req.scope.resolve(SERVICE_ORDERS_MODULE)
    const { id } = req.params
    const { status, reason } = req.body as any
    
    console.log(`Updating service order ID: ${id}`)
    console.log(`New status: ${status}`)
    console.log(`Reason: ${reason}`)
    
    // First, get the current service order to see its current status
    const currentServiceOrder = await serviceOrdersService.retrieveServiceOrder(id)
    console.log(`Current status in DB: ${currentServiceOrder?.status}`)
    
    // Validate status
    if (!status || !VALID_STATUSES.includes(status)) {
      console.log(`Invalid status provided: ${status}`)
      return res.status(400).json({ 
        error: "Validation failed", 
        details: `Status must be one of: ${VALID_STATUSES.join(", ")}` 
      })
    }
    
    console.log("Calling updateServiceOrderStatus...")
    const updatedServiceOrder = await serviceOrdersService.updateServiceOrderStatus(
      id,
      status,
      "admin", // In real app, this would be req.user.id
      reason
    )
    
    console.log(`Update complete. New status should be: ${status}`)
    console.log(`Returned service order status: ${updatedServiceOrder?.status}`)
    console.log(`Full updated service order:`, JSON.stringify(updatedServiceOrder, null, 2))
    
    res.json({ service_order: updatedServiceOrder })
  } catch (error) {
    console.error("=== ERROR in status update ===")
    console.error("Error updating service order status:", error)
    res.status(500).json({ 
      error: "Failed to update service order status",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
} 