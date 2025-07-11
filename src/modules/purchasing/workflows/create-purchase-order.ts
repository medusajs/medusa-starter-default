import { createWorkflow, WorkflowResponse } from "@medusajs/workflows-sdk"
import { createPurchaseOrderStep } from "../steps/create-purchase-order"

type WorkflowInput = {
  supplier_id: string
  items: {
    product_variant_id: string
    quantity: number
    unit_price: number
  }[]
}

export const createPurchaseOrderWorkflow = createWorkflow(
  "create-purchase-order-workflow",
  (input: WorkflowInput) => {
    const { purchaseOrder } = createPurchaseOrderStep(input)
    return new WorkflowResponse(purchaseOrder)
  }
) 