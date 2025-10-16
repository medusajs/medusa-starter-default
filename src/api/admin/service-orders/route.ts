import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createServiceOrderWorkflow } from "../../../workflows/service-orders/create-service-order-workflow"
import { SERVICE_ORDERS_MODULE } from "../../../modules/service-orders"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const serviceOrdersService: any = req.scope.resolve(SERVICE_ORDERS_MODULE)
    
    const { 
      status, 
      priority,
      service_type,
      customer_id,
      technician_id,
      q,
      limit = 50, 
      offset = 0,
      tab // Add tab parameter for backlog vs active filtering
    } = req.query
    
    // Debug logging
    console.log('Service Orders API called with:', { tab, status, limit, offset })
    
    // Build filters
    const filters: any = {}
    
    // Handle tab-based filtering (backlog vs active)
    if (tab === "backlog") {
      filters.status = "draft"
      console.log('Applying backlog filter: status = draft')
    } else if (tab === "active") {
      // For active tab, exclude draft orders
      filters.status = { $ne: "draft" }
      console.log('Applying active filter: status != draft')
    } else if (status) {
      // If specific status is provided, use it
      filters.status = status
      console.log('Applying specific status filter:', status)
    }
    
    console.log('Final filters applied:', filters)
    
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

    // Use database-level pagination with skip/take
    const config = {
      skip: Number(offset),
      take: Number(limit),
      order: { created_at: "DESC" } // Order by most recent first
    }

    // Use the listAndCount method for efficient database pagination
    const [serviceOrders, count] = await serviceOrdersService.listAndCountServiceOrdersWithLinks(filters, config)

    console.log('Fetched orders with pagination:', {
      totalCount: count,
      returnedCount: serviceOrders.length,
      offset: Number(offset),
      limit: Number(limit),
      statuses: serviceOrders.map(o => ({ id: o.id, status: o.status })).slice(0, 10)
    })

    res.json({
      service_orders: serviceOrders,
      count,
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
    const { description, customer_id, machine_id, technician_id, ...rest } = req.body as any
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

    if (!machine_id) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "Machine is required" 
      })
    }

    // Convert "unassigned" to null for technician_id
    const processedData = {
      ...rest,
      description,
      customer_id,
      machine_id,
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