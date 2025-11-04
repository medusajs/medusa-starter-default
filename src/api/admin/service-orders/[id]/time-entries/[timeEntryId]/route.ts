import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SERVICE_ORDERS_MODULE } from "../../../../../../modules/service-orders"

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    const serviceOrdersService: any = req.scope.resolve(SERVICE_ORDERS_MODULE)
    const { id } = req.params
    let { timeEntryId } = req.params as any
    const body = req.body as any

    // Get the existing entry before updating to check if timer is being stopped
    let existingEntry = null
    try {
      const entries = await serviceOrdersService.listServiceOrderTimeEntries({
        id: timeEntryId
      })
      existingEntry = entries?.[0]
    } catch (e) {
      // Continue without existing entry
    }

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
      existingEntry = activeEntries[0]
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

    const timeEntry = await serviceOrdersService.updateServiceOrderTimeEntry(timeEntryId, updateData)

    // Log event if timer is being stopped (was active, now inactive)
    const isStoppingTimer = existingEntry?.is_active === true && updateData.is_active === false
    if (isStoppingTimer) {
      try {
        // Calculate duration
        const durationHours = timeEntry.billable_hours || 0
        const hours = Math.floor(durationHours)
        const minutes = Math.round((durationHours - hours) * 60)
        const durationText = hours > 0
          ? `${hours}h ${minutes}m`
          : `${minutes}m`

        await serviceOrdersService.createServiceOrderComment({
          service_order_id: id,
          message: `Timer stopped: ${timeEntry.work_description} (${durationText})`,
          author_id: "system",
          author_name: "System",
          author_type: "system",
          is_internal: false,
          is_pinned: false,
          metadata: {
            event_type: "time_entry_stopped",
            event_data: {
              time_entry_id: timeEntry.id,
              work_description: timeEntry.work_description,
              work_category: timeEntry.work_category,
              duration_hours: durationHours,
              duration_text: durationText,
              total_cost: timeEntry.total_cost
            }
          }
        })
      } catch (eventError) {
        // Log error but don't fail the request
        console.error("Failed to log timer stop event:", eventError)
      }
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