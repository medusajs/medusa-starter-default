import { MedusaService } from "@medusajs/framework/utils"
import ServiceOrder, { ServiceOrderType, ServiceOrderPriority, ServiceOrderStatus } from "./models/service-order"
import ServiceOrderItem, { ServiceOrderItemStatus } from "./models/service-order-item" 
import ServiceOrderTimeEntry, { WorkCategory } from "./models/service-order-time-entry"
import ServiceOrderStatusHistory from "./models/service-order-status-history"

type CreateServiceOrderInput = {
  description: string
  service_type?: "normal" | "warranty" | "setup" | "emergency" | "preventive"
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
  notes?: string
}

class ServiceOrdersService extends MedusaService({
  ServiceOrder,
  ServiceOrderItem,
  ServiceOrderTimeEntry,
  ServiceOrderStatusHistory,
}) {
  
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
    
    return item
  }
  
  async addTimeEntry(serviceOrderId: string, timeEntryData: CreateTimeEntryInput) {
    const calculatedDuration = timeEntryData.end_time && timeEntryData.start_time 
      ? Math.round((timeEntryData.end_time.getTime() - timeEntryData.start_time.getTime()) / (1000 * 60))
      : timeEntryData.duration_minutes || 0
    
    const timeEntry = await this.createServiceOrderTimeEntries({
      ...timeEntryData,
      service_order_id: serviceOrderId,
      duration_minutes: calculatedDuration,
      total_cost: timeEntryData.billable_hours * timeEntryData.hourly_rate,
      is_billable: timeEntryData.is_billable ?? true,
      work_category: timeEntryData.work_category || "repair",
    })
    
    // Update service order totals
    await this.updateServiceOrderTotals(serviceOrderId)
    
    return timeEntry
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
  
  async getServiceOrdersWithItems(serviceOrderId: string) {
    const serviceOrder = await this.retrieveServiceOrder(serviceOrderId)
    const items = await this.listServiceOrderItems({ service_order_id: serviceOrderId })
    const timeEntries = await this.listServiceOrderTimeEntries({ service_order_id: serviceOrderId })
    const statusHistory = await this.listServiceOrderStatusHistories({ service_order_id: serviceOrderId })
    
    return {
      ...serviceOrder,
      items,
      time_entries: timeEntries,
      status_history: statusHistory,
    }
  }
}

export default ServiceOrdersService 