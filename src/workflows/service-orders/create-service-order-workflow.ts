import { createWorkflow, WorkflowResponse, createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SERVICE_ORDERS_MODULE } from "../../modules/service-orders"

// Type definitions
export interface CreateServiceOrderInput {
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

// Step to validate service order data
const validateServiceOrderDataStep = createStep(
  "validate-service-order-data",
  async (input: CreateServiceOrderInput) => {
    if (!input.description || input.description.trim().length === 0) {
      throw new Error("Service description is required")
    }
    
    return new StepResponse(input)
  }
)

// Step to create the service order
const createServiceOrderStep = createStep(
  "create-service-order",
  async (input: CreateServiceOrderInput, { container }) => {
    const serviceOrdersService: any = container.resolve(SERVICE_ORDERS_MODULE)
    
    // Use the service method that handles number generation
    const serviceOrder = await serviceOrdersService.createServiceOrderWithNumber(input)
    
    return new StepResponse(serviceOrder, serviceOrder.id)
  },
  async (serviceOrderId: string, { container }) => {
    // Compensation: delete the created service order if workflow fails
    if (!serviceOrderId) return
    
    const serviceOrdersService: any = container.resolve(SERVICE_ORDERS_MODULE)
    await serviceOrdersService.deleteServiceOrders([serviceOrderId])
  }
)

// Main workflow
export const createServiceOrderWorkflow = createWorkflow(
  "create-service-order",
  (input: CreateServiceOrderInput) => {
    const validatedData = validateServiceOrderDataStep(input)
    const serviceOrder = createServiceOrderStep(validatedData)
    
    return new WorkflowResponse(serviceOrder)
  }
) 