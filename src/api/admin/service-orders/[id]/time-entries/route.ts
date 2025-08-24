import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SERVICE_ORDERS_MODULE } from "../../../../../modules/service-orders"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const serviceOrdersService: any = req.scope.resolve(SERVICE_ORDERS_MODULE)
    const { id } = req.params
    
    const timeEntries = await serviceOrdersService.listServiceOrderTimeEntries({ 
      service_order_id: id 
    })
    
    res.json({ time_entries: timeEntries })
  } catch (error) {
    res.status(500).json({ 
      error: "Failed to fetch time entries",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const serviceOrdersService: any = req.scope.resolve(SERVICE_ORDERS_MODULE)
    const { id } = req.params
    const { work_description, start_time, billable_hours, hourly_rate } = req.body as any
    
    // Validate required fields
    if (!work_description || !start_time || billable_hours === undefined || !hourly_rate) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "work_description, start_time, billable_hours, and hourly_rate are required" 
      })
    }
    
    // Convert string dates to Date objects
    const body = req.body as any
    const timeEntryData = {
      ...body,
      start_time: new Date(start_time),
      end_time: body.end_time ? new Date(body.end_time) : undefined,
      // Handle is_active field for timer functionality
      is_active: body.is_active ?? false,
    }
    
    const timeEntry = await serviceOrdersService.addTimeEntry(id, timeEntryData)
    
    res.status(201).json({ time_entry: timeEntry })
  } catch (error) {
    res.status(500).json({ 
      error: "Failed to add time entry",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
} 