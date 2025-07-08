import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SERVICE_ORDERS_MODULE } from "../../../../../modules/service-orders"

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    const serviceOrdersService: any = req.scope.resolve(SERVICE_ORDERS_MODULE)
    const { id } = req.params
    const { status, userId, reason } = req.body as { 
      status: string
      userId?: string  
      reason?: string 
    }

    if (!status) {
      return res.status(400).json({ 
        error: "Status is required" 
      })
    }

    const updatedServiceOrder = await serviceOrdersService.updateServiceOrderStatus(
      id, 
      status, 
      userId || 'admin', 
      reason
    )

    res.json({ 
      service_order: updatedServiceOrder,
      message: `Status updated to ${status}` 
    })

  } catch (error) {
    res.status(500).json({ 
      error: "Failed to update service order status",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
} 