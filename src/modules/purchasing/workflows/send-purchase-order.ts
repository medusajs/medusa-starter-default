import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { validatePurchaseOrderSendable } from "../steps/validate-purchase-order-sendable"

type WorkflowInput = {
  purchase_order_id: string
}

export const sendPurchaseOrderWorkflow = createWorkflow(
  "send-purchase-order",
  (input: WorkflowInput) => {
    // Note: The validation and status update will be handled in the API route
    // using the purchasing module service directly, since we need to fetch
    // the PO first and the module already has the update logic

    return new WorkflowResponse({
      purchase_order_id: input.purchase_order_id,
    })
  }
)
