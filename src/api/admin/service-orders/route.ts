import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { createServiceOrderWorkflow } from "../../../workflows/service-orders/create-service-order-workflow"
import { SERVICE_ORDERS_MODULE } from "../../../modules/service-orders"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const serviceOrdersService: any = req.scope.resolve(SERVICE_ORDERS_MODULE)
    
    const { 
      status, 
      priority,
      service_type,
      limit = 50, 
      offset = 0 
    } = req.query
    
    // Build filters
    const filters: any = {}
    if (status) filters.status = status
    if (priority) filters.priority = priority
    if (service_type) filters.service_type = service_type
    
    const serviceOrders = await serviceOrdersService.listServiceOrders(filters)
    
    res.json({ 
      service_orders: serviceOrders,
      count: serviceOrders.length,
      offset: Number(offset),
      limit: Number(limit)
    })
  } catch (error) {
    res.status(500).json({ 
      error: "Failed to fetch service orders",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    // Validate required fields
    const { description } = req.body as any
    if (!description) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "Description is required" 
      })
    }

    const { result } = await createServiceOrderWorkflow(req.scope).run({
      input: req.body as any
    })
    
    res.status(201).json({ service_order: result })
  } catch (error) {
    res.status(500).json({ 
      error: "Failed to create service order",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
} 