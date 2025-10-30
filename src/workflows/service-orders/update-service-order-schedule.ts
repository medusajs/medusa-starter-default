import { createWorkflow, WorkflowResponse, createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SERVICE_ORDERS_MODULE } from "../../modules/service-orders"
import { Modules } from "@medusajs/framework/utils"

/**
 * TEM-247: Workflow for updating service order schedule
 * 
 * This workflow handles updating scheduled dates for service orders with:
 * - Date validation
 * - Status history logging
 * - Event emission for real-time updates
 * - Support for unscheduling (null dates)
 */

// Type definitions
export interface UpdateServiceOrderScheduleInput {
  service_order_id: string
  scheduled_start_date: Date | null
  scheduled_end_date: Date | null
  updated_by?: string
}

// Step 1: Validate date inputs
const validateScheduleDateStep = createStep(
  "validate-schedule-date",
  async (input: UpdateServiceOrderScheduleInput) => {
    // If both dates are null, this is an unscheduling operation - valid
    if (input.scheduled_start_date === null && input.scheduled_end_date === null) {
      return new StepResponse(input)
    }

    // If one date is provided, both must be provided
    if (input.scheduled_start_date === null || input.scheduled_end_date === null) {
      throw new Error("Both scheduled_start_date and scheduled_end_date must be provided, or both must be null to unschedule")
    }

    // Validate that start date is before end date
    if (input.scheduled_start_date >= input.scheduled_end_date) {
      throw new Error("Scheduled start date must be before scheduled end date")
    }

    // Validate minimum duration (30 minutes)
    const duration = input.scheduled_end_date.getTime() - input.scheduled_start_date.getTime()
    const minimumDuration = 30 * 60 * 1000 // 30 minutes in milliseconds
    if (duration < minimumDuration) {
      throw new Error("Service order must be scheduled for at least 30 minutes")
    }

    return new StepResponse(input)
  }
)

// Step 2: Update service order dates
const updateServiceOrderDatesStep = createStep(
  "update-service-order-dates",
  async (input: UpdateServiceOrderScheduleInput, { container }) => {
    const serviceOrdersService: any = container.resolve(SERVICE_ORDERS_MODULE)
    
    // Get the current service order to store for compensation
    const currentServiceOrder = await serviceOrdersService.retrieveServiceOrder(input.service_order_id)
    
    // Store original dates for compensation (including the ID for rollback)
    const originalDates = {
      service_order_id: input.service_order_id,
      scheduled_start_date: currentServiceOrder.scheduled_start_date,
      scheduled_end_date: currentServiceOrder.scheduled_end_date,
    }

    // Update the service order with new dates (single object, not array)
    const updatedServiceOrder = await serviceOrdersService.updateServiceOrders({
      id: input.service_order_id,
      scheduled_start_date: input.scheduled_start_date,
      scheduled_end_date: input.scheduled_end_date,
      updated_by: input.updated_by,
    })

    return new StepResponse(updatedServiceOrder, originalDates)
  },
  async (originalDates: any, { container }) => {
    // Compensation: restore original dates if workflow fails
    if (!originalDates) return
    
    const serviceOrdersService: any = container.resolve(SERVICE_ORDERS_MODULE)
    await serviceOrdersService.updateServiceOrders({
      id: originalDates.service_order_id,
      scheduled_start_date: originalDates.scheduled_start_date,
      scheduled_end_date: originalDates.scheduled_end_date,
    })
  }
)

// Step 3: Log status history change
const logScheduleChangeStep = createStep(
  "log-schedule-change",
  async (data: { serviceOrder: any, input: UpdateServiceOrderScheduleInput }, { container }) => {
    const serviceOrdersService: any = container.resolve(SERVICE_ORDERS_MODULE)
    
    const { serviceOrder, input } = data
    
    // Create a status history entry for the schedule change
    let reason = ""
    if (input.scheduled_start_date === null && input.scheduled_end_date === null) {
      reason = "Service order unscheduled"
    } else {
      const startDate = input.scheduled_start_date?.toISOString()
      const endDate = input.scheduled_end_date?.toISOString()
      reason = `Schedule updated: ${startDate} to ${endDate}`
    }

    try {
      // Create status history with proper structure
      const statusHistory = await serviceOrdersService.createServiceOrderStatusHistories({
        service_order_id: serviceOrder.id,
        to_status: serviceOrder.status,
        changed_by: input.updated_by || "system",
        changed_at: new Date(),
        reason,
      })

      return new StepResponse(statusHistory)
    } catch (error) {
      // If status history creation fails, log but don't fail the workflow
      console.warn("Failed to create status history for schedule change:", error)
      return new StepResponse({ success: false, error: error instanceof Error ? error.message : "Unknown error" })
    }
  }
)

// Step 4: Emit event for calendar refresh
const emitScheduleUpdateEventStep = createStep(
  "emit-schedule-update-event",
  async (serviceOrder: any, { container }) => {
    const eventBusService = container.resolve(Modules.EVENT_BUS)

    // Emit event that can be listened to by the frontend for real-time updates
    await eventBusService.emit({
      name: "service-order.schedule-updated",
      data: {
        service_order_id: serviceOrder.id,
        scheduled_start_date: serviceOrder.scheduled_start_date,
        scheduled_end_date: serviceOrder.scheduled_end_date,
      }
    })

    return new StepResponse({ success: true })
  }
)

// Main workflow
export const updateServiceOrderScheduleWorkflow = createWorkflow(
  "update-service-order-schedule",
  (input: UpdateServiceOrderScheduleInput) => {
    // Step 1: Validate dates
    const validatedInput = validateScheduleDateStep(input)
    
    // Step 2: Update service order dates
    const updatedServiceOrder = updateServiceOrderDatesStep(validatedInput)
    
    // Step 3: Log the change in status history
    logScheduleChangeStep({
      serviceOrder: updatedServiceOrder,
      input: validatedInput,
    })
    
    // Step 4: Emit event for real-time updates
    emitScheduleUpdateEventStep(updatedServiceOrder)
    
    return new WorkflowResponse(updatedServiceOrder)
  }
)

