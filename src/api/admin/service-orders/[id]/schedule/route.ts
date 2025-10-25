import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateServiceOrderScheduleWorkflow } from "../../../../../workflows/service-orders/update-service-order-schedule"

/**
 * TEM-247: API endpoint for updating service order schedule
 * 
 * POST /admin/service-orders/:id/schedule
 * 
 * Updates the scheduled dates for a service order using the workflow.
 * Supports both scheduling and unscheduling (by passing null dates).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const { scheduled_start_date, scheduled_end_date, updated_by } = req.body as any

    // Validate that ID is provided
    if (!id) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "Service order ID is required" 
      })
    }

    // Parse dates if provided (they come as strings from the request)
    let startDate: Date | null = null
    let endDate: Date | null = null

    if (scheduled_start_date !== null && scheduled_start_date !== undefined) {
      startDate = new Date(scheduled_start_date)
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: "Invalid scheduled_start_date format" 
        })
      }
    }

    if (scheduled_end_date !== null && scheduled_end_date !== undefined) {
      endDate = new Date(scheduled_end_date)
      if (isNaN(endDate.getTime())) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: "Invalid scheduled_end_date format" 
        })
      }
    }

    // Run the workflow
    const { result } = await updateServiceOrderScheduleWorkflow(req.scope).run({
      input: {
        service_order_id: id,
        scheduled_start_date: startDate,
        scheduled_end_date: endDate,
        updated_by,
      }
    })

    res.json({ 
      service_order: result,
      message: startDate === null && endDate === null 
        ? "Service order unscheduled successfully"
        : "Service order schedule updated successfully"
    })
  } catch (error) {
    // Handle workflow validation errors
    if (error instanceof Error && error.message.includes("must be")) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: error.message 
      })
    }

    res.status(500).json({ 
      error: "Failed to update service order schedule",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

