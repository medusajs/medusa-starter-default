import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SERVICE_ORDERS_MODULE } from "../../../../modules/service-orders"

/**
 * TEM-246: Calendar-optimized API endpoint
 * 
 * This endpoint is specifically designed for the calendar view to provide:
 * - Only scheduled service orders (where scheduled_start_date is not null)
 * - Minimal fields to reduce payload size
 * - Count of unscheduled orders
 * - Support for date range filtering
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const serviceOrdersService: any = req.scope.resolve(SERVICE_ORDERS_MODULE)
    
    const { 
      scheduled_start_date_gte,
      scheduled_start_date_lte,
      scheduled_end_date_gte,
      scheduled_end_date_lte,
      status,
      priority,
      technician_id,
      service_type,
    } = req.query

    // Build filters for scheduled orders only
    const filters: any = {
      scheduled_start_date: { $ne: null } // Only return scheduled orders
    }

    // Apply optional filters
    if (status) filters.status = status
    if (priority) filters.priority = priority
    if (service_type) filters.service_type = service_type
    
    if (technician_id) {
      if (technician_id === "unassigned") {
        filters.technician_id = null
      } else {
        filters.technician_id = technician_id
      }
    }

    // TEM-245: Apply date range filters
    if (scheduled_start_date_gte) {
      try {
        const startDate = new Date(scheduled_start_date_gte as string)
        if (!isNaN(startDate.getTime())) {
          filters.scheduled_start_date = {
            ...filters.scheduled_start_date,
            $gte: startDate
          }
        }
      } catch (error) {
        // Invalid date format - skip filter
      }
    }

    if (scheduled_start_date_lte) {
      try {
        const endDate = new Date(scheduled_start_date_lte as string)
        if (!isNaN(endDate.getTime())) {
          filters.scheduled_start_date = {
            ...filters.scheduled_start_date,
            $lte: endDate
          }
        }
      } catch (error) {
        // Invalid date format - skip filter
      }
    }

    if (scheduled_end_date_gte) {
      try {
        const startDate = new Date(scheduled_end_date_gte as string)
        if (!isNaN(startDate.getTime())) {
          filters.scheduled_end_date = filters.scheduled_end_date || {}
          filters.scheduled_end_date.$gte = startDate
        }
      } catch (error) {
        // Invalid date format - skip filter
      }
    }

    if (scheduled_end_date_lte) {
      try {
        const endDate = new Date(scheduled_end_date_lte as string)
        if (!isNaN(endDate.getTime())) {
          filters.scheduled_end_date = filters.scheduled_end_date || {}
          filters.scheduled_end_date.$lte = endDate
        }
      } catch (error) {
        // Invalid date format - skip filter
      }
    }

    // Fetch scheduled service orders
    const config = {
      select: [
        'id',
        'service_order_number',
        'scheduled_start_date',
        'scheduled_end_date',
        'status',
        'priority',
        'technician_id',
        'customer_id',
        'service_type',
        'description',
      ],
      order: { scheduled_start_date: "ASC" } // Order by scheduled date
    }

    const scheduledOrders = await serviceOrdersService.listServiceOrders(filters, config)

    // Get count of unscheduled orders (where scheduled_start_date is null)
    const unscheduledFilters: any = {
      scheduled_start_date: null,
      status: { $ne: "done" } // Exclude completed orders from unscheduled count
    }

    const [, unscheduledCount] = await serviceOrdersService.listAndCountServiceOrders(unscheduledFilters, { take: 0 })

    // Format response with minimal fields and truncated description
    const events = scheduledOrders.map((order: any) => ({
      id: order.id,
      service_order_number: order.service_order_number,
      scheduled_start_date: order.scheduled_start_date,
      scheduled_end_date: order.scheduled_end_date,
      status: order.status,
      priority: order.priority,
      technician_id: order.technician_id,
      customer_id: order.customer_id,
      service_type: order.service_type,
      // Truncate description to max 100 characters for performance
      description: order.description 
        ? order.description.substring(0, 100) + (order.description.length > 100 ? '...' : '')
        : '',
    }))

    res.json({
      events,
      unscheduled_count: unscheduledCount
    })
  } catch (error) {
    res.status(500).json({ 
      error: "Failed to fetch calendar data",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

