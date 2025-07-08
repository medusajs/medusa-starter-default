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
    const serviceOrdersService: any = req.scope.resolve(SERVICE_ORDERS_MODULE)
    const { id } = req.params
    const { status, reason } = req.body as any
    
    // Validate status
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: `Status must be one of: ${VALID_STATUSES.join(", ")}` 
      })
    }
    
    const updatedServiceOrder = await serviceOrdersService.updateServiceOrderStatus(
      id,
      status,
      "admin", // In real app, this would be req.user.id
      reason
    )
    
    res.json({ service_order: updatedServiceOrder })
  } catch (error) {
    res.status(500).json({ 
      error: "Failed to update service order status",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
} 