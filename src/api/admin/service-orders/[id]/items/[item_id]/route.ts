import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SERVICE_ORDERS_MODULE } from "../../../../../../modules/service-orders"

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const serviceOrdersService: any = req.scope.resolve(SERVICE_ORDERS_MODULE)
    const { id: serviceOrderId, item_id } = req.params
    
    // TODO: Get current user ID from auth context
    const userId = "current-user" // Replace with actual user ID from auth
    
    const result = await serviceOrdersService.removeServiceOrderItem(serviceOrderId, item_id, userId)
    
    res.status(200).json(result)
  } catch (error) {
    res.status(500).json({ 
      error: "Failed to remove service order item",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
} 