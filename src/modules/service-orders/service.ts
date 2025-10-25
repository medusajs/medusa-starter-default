import { MedusaService, Modules } from "@medusajs/framework/utils"
import ServiceOrder, { ServiceOrderType, ServiceOrderPriority, ServiceOrderStatus } from "./models/service-order"
import ServiceOrderItem, { ServiceOrderItemStatus } from "./models/service-order-item" 
import ServiceOrderTimeEntry, { WorkCategory } from "./models/service-order-time-entry"
import ServiceOrderStatusHistory from "./models/service-order-status-history"
import ServiceOrderComment, { CommentAuthorType } from "./models/service-order-comment"
import { CreateServiceOrderCommentDTO, UpdateServiceOrderCommentDTO } from "./types"
import { ServiceOrderEventLogger } from "./helpers/event-logger"

type CreateServiceOrderInput = {
  description: string
  service_type?: "insurance" | "warranty" | "internal" | "standard" | "sales_prep" | "quote"
  priority?: "low" | "normal" | "high" | "urgent"
  customer_complaint?: string
  scheduled_start_date?: Date
  scheduled_end_date?: Date
  estimated_hours?: number
  labor_rate?: number
  created_by?: string
  metadata?: Record<string, any>
}

type CreateServiceOrderItemInput = {
  title: string
  description?: string
  sku?: string
  quantity_needed: number
  unit_price: number
  is_warranty_covered?: boolean
  notes?: string
  product_id?: string
  variant_id?: string
}

type CreateTimeEntryInput = {
  work_description: string
  work_category?: "diagnosis" | "repair" | "testing" | "documentation" | "travel"
  start_time: Date
  end_time?: Date
  duration_minutes?: number
  billable_hours: number
  hourly_rate: number
  is_billable?: boolean
  is_active?: boolean
  notes?: string
}

class ServiceOrdersService extends MedusaService({
  ServiceOrder,
  ServiceOrderItem,
  ServiceOrderTimeEntry,
  ServiceOrderStatusHistory,
  ServiceOrderComment,
}) {
  protected eventBusService_: any

  constructor(container: any) {
    super(...arguments)
    this.eventBusService_ = container[Modules.EVENT_BUS]
  }
  
  async generateServiceOrderNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const orders = await this.listServiceOrders({})
    const yearlyOrders = orders.filter(order => 
      order.service_order_number?.startsWith(`SO-${year}`)
    )
    return `SO-${year}-${String(yearlyOrders.length + 1).padStart(3, '0')}`
  }
  
  async createServiceOrderWithNumber(data: CreateServiceOrderInput) {
    const serviceOrderNumber = await this.generateServiceOrderNumber()
    
    const serviceOrder = await this.createServiceOrders({
      ...data,
      service_order_number: serviceOrderNumber,
      status: "draft",
      total_cost: 0,
      actual_hours: 0,
    })
    
    // Create status history entry
    await this.createServiceOrderStatusHistories({
      service_order_id: serviceOrder.id,
      to_status: serviceOrder.status,
      changed_by: data.created_by || "system",
      changed_at: new Date(),
      reason: "Service order created",
    })
    
    return serviceOrder
  }
  
  async updateServiceOrderStatus(
    id: string, 
    newStatus: typeof ServiceOrderStatus[keyof typeof ServiceOrderStatus], 
    userId: string, 
    reason?: string
  ) {
    // Get the current service order
    const serviceOrder = await this.retrieveServiceOrder(id)
    if (!serviceOrder) {
      throw new Error("Service order not found")
    }
    
    const oldStatus = serviceOrder.status
    
    try {
      // Update the service order status
      const updatedServiceOrder = await this.updateServiceOrders({
        id: id,
        status: newStatus,
        updated_by: userId,
      })
      
      // Verify the update worked
      const verifyUpdate = await this.retrieveServiceOrder(id)
      
      if (verifyUpdate?.status !== newStatus) {
        throw new Error(`Database persistence failure: Status change from '${oldStatus}' to '${newStatus}' was not saved. This suggests a database schema, constraint, or transaction issue.`)
      }
      
      // Create status history
      await this.createServiceOrderStatusHistories({
        service_order_id: id,
        from_status: oldStatus,
        to_status: newStatus,
        changed_by: userId,
        changed_at: new Date(),
        reason,
      })

      // Emit service_order.updated event
      try {
        await this.eventBusService_.emit({
          name: "service_order.updated",
          data: {
            id: id,
            status: newStatus,
            previous_status: oldStatus,
            changed_by: userId,
          },
        })
      } catch (eventError) {
        // Log but don't fail the status update if event emission fails
        console.error(`Failed to emit service_order.updated event for ${id}:`, eventError)
      }

      // Log status change event
      try {
        const eventTemplate = ServiceOrderEventLogger.EventTemplates.statusChanged(oldStatus, newStatus, reason)
        await ServiceOrderEventLogger.logEvent({
          serviceOrderId: id,
          userId,
          ...eventTemplate
        }, this)
      } catch (eventError) {
        // Don't fail the main operation if event logging fails
      }

      return updatedServiceOrder
      
    } catch (error) {
      throw error
    }
  }
  
  async addServiceOrderItem(serviceOrderId: string, itemData: CreateServiceOrderItemInput) {
    const item = await this.createServiceOrderItems({
      ...itemData,
      service_order_id: serviceOrderId,
      total_price: itemData.quantity_needed * itemData.unit_price,
      status: "pending",
    })
    
    // Update service order totals
    await this.updateServiceOrderTotals(serviceOrderId)

    // Log part added event with grouping
    try {
      const eventTemplate = ServiceOrderEventLogger.EventTemplates.partAdded(item)
      await ServiceOrderEventLogger.logEvent({
        serviceOrderId,
        ...eventTemplate
      }, this, ServiceOrderEventLogger.GroupConfigs.parts)
    } catch (eventError) {
      // Don't fail the main operation if event logging fails
    }
    
    return item
  }

  async removeServiceOrderItem(serviceOrderId: string, itemId: string, userId?: string) {
    // Get item details before deletion for event logging
    const items = await this.listServiceOrderItems({ id: itemId })
    const item = items[0]
    if (!item) {
      throw new Error("Service order item not found")
    }

    // Delete the item
    await this.deleteServiceOrderItems([itemId])
    
    // Update service order totals
    await this.updateServiceOrderTotals(serviceOrderId)

    // Log part removed event with grouping
    try {
      const eventTemplate = ServiceOrderEventLogger.EventTemplates.partRemoved(item)
      await ServiceOrderEventLogger.logEvent({
        serviceOrderId,
        userId,
        ...eventTemplate
      }, this, ServiceOrderEventLogger.GroupConfigs.parts)
    } catch (eventError) {
      // Don't fail the main operation if event logging fails
    }

    return { deleted: true, id: itemId }
  }
  
  async addTimeEntry(serviceOrderId: string, timeEntryData: CreateTimeEntryInput) {
    const calculatedDuration = timeEntryData.end_time && timeEntryData.start_time 
      ? Math.round((timeEntryData.end_time.getTime() - timeEntryData.start_time.getTime()) / (1000 * 60))
      : timeEntryData.duration_minutes || 0
    
    // Use the pattern from existing working methods  
    const timeEntry = await this.createServiceOrderTimeEntries({
      ...timeEntryData,
      service_order_id: serviceOrderId,
      duration_minutes: calculatedDuration,
      total_cost: timeEntryData.billable_hours * timeEntryData.hourly_rate,
      is_billable: timeEntryData.is_billable ?? true,
      is_active: timeEntryData.is_active ?? false,
      work_category: timeEntryData.work_category || "repair",
    })
    
    // Update service order totals
    await this.updateServiceOrderTotals(serviceOrderId)

    // Log time entry added event with grouping
    try {
      const eventTemplate = ServiceOrderEventLogger.EventTemplates.timeEntryAdded(timeEntry)
      await ServiceOrderEventLogger.logEvent({
        serviceOrderId,
        ...eventTemplate
      }, this, ServiceOrderEventLogger.GroupConfigs.timeEntries)
    } catch (eventError) {
      // Don't fail the main operation if event logging fails
    }
    
    return timeEntry
  }

  async updateServiceOrderTimeEntry(timeEntryId: string, updateData: Partial<CreateTimeEntryInput>) {
    // Retrieve existing entry to fill in missing values and compute derived fields
    const existingList = await this.listServiceOrderTimeEntries({ id: timeEntryId })
    if (!existingList.length) {
      throw new Error("Time entry not found")
    }
    const existing = existingList[0]

    // Prepare update data
    const processedData: Record<string, any> = { ...updateData }

    // If end_time is provided and is_active wasn't explicitly set, force deactivate
    if (processedData.end_time && typeof processedData.is_active === "undefined") {
      processedData.is_active = false
    }

    // Determine start/end for calculations
    const startForCalc = processedData.start_time ?? existing.start_time
    const endForCalc = processedData.end_time ?? existing.end_time

    // Calculate duration if we have both times
    if (startForCalc && endForCalc) {
      const minutes = Math.round((endForCalc.getTime() - startForCalc.getTime()) / (1000 * 60))
      processedData.duration_minutes = minutes

      // If billable_hours not provided, derive from duration
      if (typeof processedData.billable_hours === "undefined") {
        processedData.billable_hours = Math.round((minutes / 60) * 100) / 100
      }
    }

    // Calculate total cost if possible (use provided hourly_rate or existing)
    const hourlyRateForCalc = processedData.hourly_rate ?? existing.hourly_rate
    if (typeof processedData.billable_hours !== "undefined" && typeof hourlyRateForCalc !== "undefined") {
      processedData.total_cost = processedData.billable_hours * hourlyRateForCalc
    }

    // Update using selector signature to return a single updated entity
    const timeEntry = await this.updateServiceOrderTimeEntries({ id: timeEntryId }, processedData)
    
    // Log time entry updated event
    try {
      const eventTemplate = ServiceOrderEventLogger.EventTemplates.timeEntryAdded(timeEntry)
      await ServiceOrderEventLogger.logEvent({
        serviceOrderId: timeEntry.service_order_id,
        eventType: 'time_entry_updated',
        message: `Time entry updated: ${timeEntry.work_description}`,
        eventData: eventTemplate.eventData,
      }, this, ServiceOrderEventLogger.GroupConfigs.timeEntries)
    } catch (eventError) {
      // Don't fail the main operation if event logging fails
    }
    
    return timeEntry
  }

  async deleteServiceOrderTimeEntry(timeEntryId: string) {
    // Get the time entry first to get service_order_id for logging
    const timeEntries = await this.listServiceOrderTimeEntries({ id: timeEntryId })
    if (timeEntries.length === 0) {
      throw new Error("Time entry not found")
    }
    const timeEntry = timeEntries[0]
    const serviceOrderId = timeEntry.service_order_id
    
    // Delete the time entry using the same pattern as existing methods
    await this.deleteServiceOrderTimeEntries([timeEntryId])
    
    // Log time entry deleted event
    try {
      const eventTemplate = ServiceOrderEventLogger.EventTemplates.timeEntryAdded(timeEntry)
      await ServiceOrderEventLogger.logEvent({
        serviceOrderId,
        eventType: 'time_entry_deleted',
        message: `Time entry deleted: ${timeEntry.work_description}`,
        eventData: eventTemplate.eventData,
      }, this, ServiceOrderEventLogger.GroupConfigs.timeEntries)
    } catch (eventError) {
      // Don't fail the main operation if event logging fails
    }
    
    return { deleted: true, id: timeEntryId }
  }
  
  async updateServiceOrderTotals(serviceOrderId: string) {
    // Calculate labor costs
    const timeEntries = await this.listServiceOrderTimeEntries({
      service_order_id: serviceOrderId,
      is_billable: true
    })
    
    const totalLaborCost = timeEntries.reduce((sum, entry) => sum + (entry.total_cost || 0), 0)
    const actualHours = timeEntries.reduce((sum, entry) => sum + (entry.billable_hours || 0), 0)
    
    // Calculate parts costs
    const items = await this.listServiceOrderItems({
      service_order_id: serviceOrderId
    })
    
    const totalPartsCost = items.reduce((sum, item) => sum + (item.total_price || 0), 0)
    
    // Update service order
    await this.updateServiceOrders(
      { id: serviceOrderId },
      {
        total_labor_cost: totalLaborCost,
        total_parts_cost: totalPartsCost,
        total_cost: totalLaborCost + totalPartsCost,
        actual_hours: actualHours,
      }
    )
  }
  
  async getServiceOrdersByStatus(status: string) {
    return await this.listServiceOrders({ status })
  }
  
  async listServiceOrdersWithLinks(filters: any = {}, config: any = {}) {
    // Get service orders using the base service method with pagination config
    const serviceOrders = await this.listServiceOrders(filters, config)

    // For now, return service orders as-is and let the frontend handle the lookup
    // This matches the behavior seen in the list view where lookups are done client-side
    // TODO: Implement proper server-side linking when MedusaJS Query API is fully set up
    return serviceOrders
  }

  async listAndCountServiceOrdersWithLinks(filters: any = {}, config: any = {}) {
    // Use the built-in listAndCount method from MedusaService base class
    // This method automatically handles pagination with skip/take parameters
    const [serviceOrders, count] = await this.listAndCountServiceOrders(filters, config)

    // For now, return service orders as-is and let the frontend handle the lookup
    // This matches the behavior seen in the list view where lookups are done client-side
    // TODO: Implement proper server-side linking when MedusaJS Query API is fully set up
    return [serviceOrders, count]
  }
  
  async getServiceOrdersWithItems(serviceOrderId: string) {
    const serviceOrder = await this.retrieveServiceOrder(serviceOrderId)
    const items = await this.listServiceOrderItems({ service_order_id: serviceOrderId })
    const timeEntries = await this.listServiceOrderTimeEntries({ service_order_id: serviceOrderId })
    const statusHistory = await this.listServiceOrderStatusHistories({ service_order_id: serviceOrderId })
    const comments = await this.listServiceOrderComments({ service_order_id: serviceOrderId })
    
    // TODO: Use MedusaJS Query API to fetch linked customer and machine data
    // For now, we'll include the IDs and let the frontend handle fetching details
    return {
      ...serviceOrder,
      items,
      time_entries: timeEntries,
      status_history: statusHistory,
      comments,
    }
  }

  // Comment Management Methods
  async createServiceOrderComment(data: CreateServiceOrderCommentDTO) {
    const comment = await this.createServiceOrderComments({
      ...data,
      is_edited: false,
    })

    return comment
  }

  async updateServiceOrderComment(data: UpdateServiceOrderCommentDTO) {
    const { id, ...updateData } = data
    
    const comment = await this.updateServiceOrderComments(
      { id },
      {
        ...updateData,
        is_edited: true,
        edited_at: new Date(),
      }
    )

    return comment
  }

  async deleteServiceOrderComment(commentId: string) {
    await this.deleteServiceOrderComments([commentId])
  }

  async getServiceOrderCommentsWithReplies(serviceOrderId: string) {
    const comments = await this.listServiceOrderComments(
      { service_order_id: serviceOrderId },
      { 
        select: [
          "id", 
          "message", 
          "author_id", 
          "author_type", 
          "author_name", 
          "parent_comment_id",
          "is_internal",
          "is_pinned",
          "attachments",
          "mentions",
          "is_edited",
          "edited_at",
          "metadata",
          "created_at",
          "updated_at"
        ],
        order: { created_at: "ASC" }
      }
    )

    // Organize comments by threading - top-level comments and their replies
    const topLevelComments = comments.filter(c => !c.parent_comment_id)
    const replies = comments.filter(c => c.parent_comment_id)

    // Group replies by parent comment ID
    const repliesByParent = replies.reduce((acc, reply) => {
      if (!acc[reply.parent_comment_id!]) {
        acc[reply.parent_comment_id!] = []
      }
      acc[reply.parent_comment_id!].push(reply)
      return acc
    }, {} as Record<string, any[]>)

    // Attach replies to their parent comments
    const commentsWithReplies = topLevelComments.map(comment => ({
      ...comment,
      replies: repliesByParent[comment.id] || []
    }))

    return commentsWithReplies
  }

  async pinComment(commentId: string, isPinned: boolean = true) {
    const comment = await this.updateServiceOrderComments(
      { id: commentId },
      { is_pinned: isPinned }
    )

    return comment
  }

  async getServiceOrderCommentsByMention(userId: string) {
    // For now, we'll get all comments and filter client-side
    // TODO: Implement proper JSON field filtering when MedusaJS supports it
    const allComments = await this.listServiceOrderComments({})
    
    // Filter comments that mention the user
    const mentionedComments = allComments.filter(comment => {
      if (!comment.mentions) return false
      
      // Handle both array and object formats
      if (Array.isArray(comment.mentions)) {
        return comment.mentions.includes(userId)
      }
      
      // Handle object format where mentions might be stored differently
      const mentionsObj = comment.mentions as Record<string, any>
      return Object.values(mentionsObj).includes(userId)
    })

    return mentionedComments
  }

  /**
   * TEM-248: Optimized method for calendar view queries
   * 
   * This method is specifically optimized for calendar date range queries:
   * - Uses database indexes on scheduled_start_date and scheduled_end_date
   * - Returns only scheduled orders (non-null dates)
   * - Supports efficient date range filtering
   * 
   * @param dateRange - Start and end dates for the calendar view
   * @param additionalFilters - Optional filters (status, priority, technician_id, etc.)
   * @returns Array of scheduled service orders within the date range
   */
  async listScheduledServiceOrders(
    dateRange: { start: Date; end: Date },
    additionalFilters?: {
      status?: string
      priority?: string
      technician_id?: string | null
      service_type?: string
    }
  ) {
    // Build filters for scheduled orders within date range
    const filters: any = {
      // Only orders with scheduled dates
      scheduled_start_date: {
        $ne: null,
        $gte: dateRange.start,
        $lte: dateRange.end,
      }
    }

    // Apply additional filters if provided
    if (additionalFilters) {
      if (additionalFilters.status) {
        filters.status = additionalFilters.status
      }
      if (additionalFilters.priority) {
        filters.priority = additionalFilters.priority
      }
      if (additionalFilters.technician_id !== undefined) {
        filters.technician_id = additionalFilters.technician_id
      }
      if (additionalFilters.service_type) {
        filters.service_type = additionalFilters.service_type
      }
    }

    // Use optimized query with indexed fields
    // The database will use the indexes created in TEM-248
    const serviceOrders = await this.listServiceOrders(filters, {
      order: { scheduled_start_date: "ASC" },
    })

    return serviceOrders
  }

  /**
   * TEM-248: Get count of unscheduled service orders
   * 
   * Efficiently counts service orders that don't have scheduled dates.
   * Used by calendar view to show unscheduled orders count.
   * 
   * @returns Count of unscheduled service orders (excluding completed)
   */
  async getUnscheduledOrdersCount() {
    const filters = {
      scheduled_start_date: null,
      status: { $ne: "done" } // Exclude completed orders
    }

    const [, count] = await this.listAndCountServiceOrders(filters, { take: 0 })
    return count
  }
}

export default ServiceOrdersService 