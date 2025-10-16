import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SERVICE_ORDERS_MODULE } from "../../../../../modules/service-orders"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const { limit = 10, offset = 0 } = req.query
    
    const serviceOrdersService = req.scope.resolve(SERVICE_ORDERS_MODULE)
    
    // Filter for technician's in_progress service orders only
    const filters = {
      technician_id: id,
      status: "in_progress"
    }

    // Use database-level pagination
    const config = {
      skip: Number(offset),
      take: Number(limit),
      order: { created_at: "DESC" }
    }

    const [serviceOrders, count] = await serviceOrdersService.listAndCountServiceOrdersWithLinks(filters, config)

    res.json({
      service_orders: serviceOrders,
      count,
      offset: Number(offset),
      limit: Number(limit)
    })
  } catch (error) {
    console.error("Error fetching technician's service orders:", error)
    res.status(500).json({ 
      error: "Failed to fetch technician's service orders",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}