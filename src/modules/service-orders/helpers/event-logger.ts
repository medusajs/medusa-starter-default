import { SERVICE_ORDERS_MODULE } from "../index"

export interface EventLogInput {
  serviceOrderId: string
  eventType: string
  message: string
  eventData?: Record<string, any>
  userId?: string
  isInternal?: boolean
}

export interface EventGroupConfig {
  groupKey: string
  timeWindowMinutes: number
  maxEvents: number
}

export class ServiceOrderEventLogger {
  private static pendingEvents: Map<string, Array<EventLogInput & { timestamp: Date }>> = new Map()
  private static flushTimers: Map<string, NodeJS.Timeout> = new Map()

  /**
   * Log a single event to the service order activity feed
   */
  static async logEvent(
    input: EventLogInput,
    serviceOrdersService: any,
    groupConfig?: EventGroupConfig
  ): Promise<void> {
    try {
      // If grouping is enabled, handle batching
      if (groupConfig) {
        await this.handleGroupedEvent(input, serviceOrdersService, groupConfig)
        return
      }

      // Log single event immediately
      await this.createEventComment(input, serviceOrdersService)
    } catch (error) {
      console.error("Failed to log service order event:", error)
      // Don't throw - event logging should not break main functionality
    }
  }

  /**
   * Handle grouped events with time-based batching
   */
  private static async handleGroupedEvent(
    input: EventLogInput,
    serviceOrdersService: any,
    groupConfig: EventGroupConfig
  ): Promise<void> {
    const groupKey = `${input.serviceOrderId}:${groupConfig.groupKey}`
    
    // Add event to pending group
    if (!this.pendingEvents.has(groupKey)) {
      this.pendingEvents.set(groupKey, [])
    }
    
    const events = this.pendingEvents.get(groupKey)!
    events.push({ ...input, timestamp: new Date() })

    // Clear existing timer
    if (this.flushTimers.has(groupKey)) {
      clearTimeout(this.flushTimers.get(groupKey)!)
    }

    // Set new flush timer
    const timer = setTimeout(async () => {
      await this.flushGroupedEvents(groupKey, serviceOrdersService, groupConfig)
    }, groupConfig.timeWindowMinutes * 60 * 1000)

    this.flushTimers.set(groupKey, timer)

    // If we hit max events, flush immediately
    if (events.length >= groupConfig.maxEvents) {
      clearTimeout(timer)
      await this.flushGroupedEvents(groupKey, serviceOrdersService, groupConfig)
    }
  }

  /**
   * Flush grouped events as a summary comment
   */
  private static async flushGroupedEvents(
    groupKey: string,
    serviceOrdersService: any,
    groupConfig: EventGroupConfig
  ): Promise<void> {
    const events = this.pendingEvents.get(groupKey)
    if (!events || events.length === 0) return

    // Clear from pending
    this.pendingEvents.delete(groupKey)
    this.flushTimers.delete(groupKey)

    if (events.length === 1) {
      // Single event, log normally
      await this.createEventComment(events[0], serviceOrdersService)
      return
    }

    // Create grouped summary
    const firstEvent = events[0]
    const summary = this.createEventSummary(events, groupConfig.groupKey)
    
    await this.createEventComment({
      serviceOrderId: firstEvent.serviceOrderId,
      eventType: `${groupConfig.groupKey}_batch`,
      message: summary,
      eventData: {
        groupedEvents: events.map(e => ({
          type: e.eventType,
          data: e.eventData,
          timestamp: e.timestamp
        })),
        eventCount: events.length
      },
      userId: firstEvent.userId,
      isInternal: true
    }, serviceOrdersService)
  }

  /**
   * Create summary message for grouped events
   */
  private static createEventSummary(events: Array<EventLogInput & { timestamp: Date }>, groupType: string): string {
    const count = events.length
    
    switch (groupType) {
      case 'parts':
        const addedCount = events.filter(e => e.eventType === 'part_added').length
        const removedCount = events.filter(e => e.eventType === 'part_removed').length
        
        if (addedCount > 0 && removedCount > 0) {
          return `Parts updated: ${addedCount} added, ${removedCount} removed`
        } else if (addedCount > 0) {
          return `Added ${addedCount} part${addedCount > 1 ? 's' : ''}`
        } else if (removedCount > 0) {
          return `Removed ${removedCount} part${removedCount > 1 ? 's' : ''}`
        }
        break
        
      case 'time_entries':
        return `Added ${count} time entr${count > 1 ? 'ies' : 'y'}`
        
      default:
        return `${count} ${groupType} actions performed`
    }
    
    return `${count} actions performed`
  }

  /**
   * Create the actual system comment
   */
  private static async createEventComment(input: EventLogInput, serviceOrdersService: any): Promise<void> {
    console.log("Creating event comment:", {
      eventType: input.eventType,
      message: input.message,
      serviceOrderId: input.serviceOrderId
    })

    const comment = await serviceOrdersService.createServiceOrderComment({
      service_order_id: input.serviceOrderId,
      message: input.message,
      author_id: input.userId || "system",
      author_name: "System",
      author_type: "system",
      is_internal: input.isInternal ?? true,
      metadata: {
        event_type: input.eventType,
        event_data: input.eventData,
        timestamp: new Date().toISOString()
      }
    })

    console.log("Event comment created successfully:", comment.id)
  }

  /**
   * Pre-defined event templates for common actions
   */
  static readonly EventTemplates = {
    // Parts events
    partAdded: (itemData: any): Omit<EventLogInput, 'serviceOrderId'> => ({
      eventType: 'part_added',
      message: `Added part: ${itemData.title} (Qty: ${itemData.quantity_needed}${itemData.unit_price ? `, $${itemData.unit_price}` : ''})`,
      eventData: { 
        itemId: itemData.id,
        title: itemData.title,
        quantity: itemData.quantity_needed,
        price: itemData.unit_price,
        action: 'added'
      }
    }),

    partRemoved: (itemData: any): Omit<EventLogInput, 'serviceOrderId'> => ({
      eventType: 'part_removed',
      message: `Removed part: ${itemData.title}`,
      eventData: { 
        itemId: itemData.id,
        title: itemData.title,
        action: 'removed'
      }
    }),

    // Time entry events
    timeEntryAdded: (timeData: any): Omit<EventLogInput, 'serviceOrderId'> => ({
      eventType: 'time_entry_added',
      message: `Added time entry: ${timeData.work_description} (${timeData.billable_hours}h${timeData.total_cost ? `, $${timeData.total_cost}` : ''})`,
      eventData: {
        timeEntryId: timeData.id,
        description: timeData.work_description,
        hours: timeData.billable_hours,
        cost: timeData.total_cost,
        category: timeData.work_category,
        action: 'added'
      }
    }),

    // Status events
    statusChanged: (fromStatus: string, toStatus: string, reason?: string): Omit<EventLogInput, 'serviceOrderId'> => ({
      eventType: 'status_changed',
      message: `Status changed: ${fromStatus.replace('_', ' ')} → ${toStatus.replace('_', ' ')}${reason ? ` (${reason})` : ''}`,
      eventData: {
        from_status: fromStatus,
        to_status: toStatus,
        reason,
        action: 'status_change'
      }
    }),

    // Assignment events
    technicianAssigned: (technicianName: string): Omit<EventLogInput, 'serviceOrderId'> => ({
      eventType: 'technician_assigned',
      message: `Technician assigned: ${technicianName}`,
      eventData: {
        technician_name: technicianName,
        action: 'assigned'
      }
    })
  }

  /**
   * Grouping configurations for common event types
   */
  static readonly GroupConfigs = {
    parts: {
      groupKey: 'parts',
      timeWindowMinutes: 5,
      maxEvents: 10
    },
    timeEntries: {
      groupKey: 'time_entries', 
      timeWindowMinutes: 10,
      maxEvents: 5
    }
  }
} 