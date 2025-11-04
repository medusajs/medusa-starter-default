import { createWorkflow, WorkflowResponse, createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SERVICE_ORDERS_MODULE } from "../../modules/service-orders"

// Type definitions
export interface CreateServiceOrderInput {
  description: string
  customer_id: string
  machine_id: string
  technician_id?: string | null
  service_type?: "insurance" | "warranty" | "internal" | "standard" | "sales_prep" | "quote"
  priority?: "low" | "normal" | "high" | "urgent"
  service_location?: "workshop" | "customer_location"
  customer_complaint?: string
  scheduled_start_date?: Date | string
  scheduled_end_date?: Date | string
  estimated_hours?: number
  labor_rate?: number
  diagnosis?: string
  notes?: string
  service_address_line_1?: string
  service_address_line_2?: string
  service_city?: string
  service_postal_code?: string
  service_country?: string
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