import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SERVICE_ORDERS_MODULE } from "../../../../../modules/service-orders"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const serviceOrdersService: any = req.scope.resolve(SERVICE_ORDERS_MODULE)
    const { id } = req.params
    
    const items = await serviceOrdersService.listServiceOrderItems({ 
      service_order_id: id 
    })
    
    res.json({ items })
  } catch (error) {
    res.status(500).json({ 
      error: "Failed to fetch service order items",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const serviceOrdersService: any = req.scope.resolve(SERVICE_ORDERS_MODULE)
    const { id } = req.params
    const { title, quantity_needed, unit_price, product_id, variant_id } = req.body as any
    
    // Validate required fields - either manual entry or product variant selection
    if (!quantity_needed || quantity_needed <= 0) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "Quantity is required and must be greater than 0" 
      })
    }

    // If using product variant, validate that we have the necessary fields
    if (product_id && variant_id) {
      if (!title) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: "Title is required when using product variants" 
        })
      }
    } else {
      // Manual entry validation
      if (!title || !unit_price) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: "Title and unit_price are required for manual entry" 
        })
      }
    }
    
    const item = await serviceOrdersService.addServiceOrderItem(id, req.body as any)
    
    res.status(201).json({ item })
  } catch (error) {
    res.status(500).json({ 
      error: "Failed to add service order item",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
} 