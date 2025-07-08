import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { createServiceOrderWorkflow } from "../../../workflows/service-orders/create-service-order-workflow"
import { SERVICE_ORDERS_MODULE } from "../../../modules/service-orders"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    
    const { 
      status, 
      priority,
      service_type,
      customer_id,
      technician_id,
      q,
      limit = 50, 
      offset = 0 
    } = req.query
    
    // Build filters
    const filters: any = {}
    if (status) filters.status = status
    if (priority) filters.priority = priority
    if (service_type) filters.service_type = service_type
    if (customer_id) filters.customer_id = customer_id
    if (technician_id) {
      if (technician_id === "unassigned") {
        filters.technician_id = null
      } else {
        filters.technician_id = technician_id
      }
    }
    
    // Add search functionality
    if (q) {
      filters.$or = [
        { service_order_number: { $ilike: `%${q}%` } },
        { description: { $ilike: `%${q}%` } },
        { customer_complaint: { $ilike: `%${q}%` } },
      ]
    }

    // Use Query to fetch service orders with linked customer and technician data
    const { data: serviceOrders } = await query.graph({
      entity: "service_order",
      fields: [
        "*",
        "customer.*",
        "technician.*",
      ],
      filters,
      pagination: {
        take: Number(limit),
        skip: Number(offset),
      },
    })
    
    res.json({ 
      service_orders: serviceOrders,
      count: serviceOrders.length,
      offset: Number(offset),
      limit: Number(limit)
    })
  } catch (error) {
    console.error("Error fetching service orders:", error)
    res.status(500).json({ 
      error: "Failed to fetch service orders",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    // Validate required fields
    const { description, customer_id, technician_id, ...rest } = req.body as any
    if (!description) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "Description is required" 
      })
    }
    
    if (!customer_id) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "Customer is required" 
      })
    }

    // Convert "unassigned" to null for technician_id
    const processedData = {
      ...rest,
      description,
      customer_id,
      technician_id: technician_id === "unassigned" ? null : technician_id,
    }

    const { result } = await createServiceOrderWorkflow(req.scope).run({
      input: processedData
    })
    
    res.status(201).json({ service_order: result })
  } catch (error) {
    console.error("Error creating service order:", error)
    res.status(500).json({ 
      error: "Failed to create service order",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
} 