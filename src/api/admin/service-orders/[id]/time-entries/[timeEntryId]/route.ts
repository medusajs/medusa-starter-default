import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SERVICE_ORDERS_MODULE } from "../../../../../../modules/service-orders"

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    const serviceOrdersService: any = req.scope.resolve(SERVICE_ORDERS_MODULE)
    const { id } = req.params
    let { timeEntryId } = req.params as any
    const body = req.body as any
    
    // Resolve missing/invalid timeEntryId by finding the active entry for this service order
    const isInvalidParam = !timeEntryId || timeEntryId === "undefined" || timeEntryId === "null"
    if (isInvalidParam) {
      const activeEntries = await serviceOrdersService.listServiceOrderTimeEntries({
        service_order_id: id,
        is_active: true,
      })

      if (!activeEntries?.length) {
        return res.status(400).json({
          error: "Invalid time entry id",
          details: "No active time entry found to update for this service order",
        })
      }

      timeEntryId = activeEntries[0].id
    }

    // Convert string dates to Date objects if they exist
    const updateData = {
      ...body,
      start_time: body.start_time ? new Date(body.start_time) : undefined,
      end_time: body.end_time ? new Date(body.end_time) : undefined,
    }
    
    // Remove undefined values to avoid overwriting with undefined
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key]
      }
    })
    
    const updated = await serviceOrdersService.updateServiceOrderTimeEntry(timeEntryId, updateData)
    const timeEntry = Array.isArray(updated) ? updated[0] : updated
    
    // Update service order totals after time entry update
    try {
      await serviceOrdersService.updateServiceOrderTotals(id)
    } catch (totalsError) {
      console.error("Failed to update service order totals:", totalsError)
      // Don't fail the main operation if totals update fails
    }
    
    res.json({ time_entry: timeEntry })
  } catch (error) {
    res.status(500).json({ 
      error: "Failed to update time entry",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const serviceOrdersService: any = req.scope.resolve(SERVICE_ORDERS_MODULE)
    const { id, timeEntryId } = req.params
    
    await serviceOrdersService.deleteServiceOrderTimeEntry(timeEntryId)
    
    // Update service order totals after time entry deletion
    await serviceOrdersService.updateServiceOrderTotals(id)
    
    res.json({ deleted: true, id: timeEntryId })
  } catch (error) {
    res.status(500).json({ 
      error: "Failed to delete time entry",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}