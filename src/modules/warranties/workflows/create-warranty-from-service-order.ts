import { createWorkflow, WorkflowData } from "@medusajs/framework/workflows-sdk"
import { createWarrantyFromServiceOrderStep } from "./steps/create-warranty-from-service-order"
import { ConvertServiceOrderToWarrantyInput } from "../types"

export const createWarrantyFromServiceOrderWorkflow = createWorkflow(
  "create-warranty-from-service-order",
  (input: WorkflowData<ConvertServiceOrderToWarrantyInput>) => {
    const warranty = createWarrantyFromServiceOrderStep(input)
    
    return warranty
  }
) 