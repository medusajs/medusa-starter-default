import { createWorkflow, WorkflowResponse } from "@medusajs/workflows-sdk"
import { receivePurchaseOrderStep } from "../steps/receive-purchase-order"

type WorkflowInput = {
  purchase_order_id: string
  items: {
    purchase_order_item_id: string
    quantity_received: number
    received_date?: Date
    notes?: string
  }[]
}

export const receivePurchaseOrderWorkflow = createWorkflow(
  "receive-purchase-order-workflow",
  (input: WorkflowInput) => {
    const { purchaseOrder } = receivePurchaseOrderStep(input)
    return new WorkflowResponse(purchaseOrder)
  }
) 