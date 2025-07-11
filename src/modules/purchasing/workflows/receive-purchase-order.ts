import { createWorkflow, WorkflowResponse } from "@medusajs/workflows-sdk"
import { receivePurchaseOrderStep } from "../steps/receive-purchase-order"
import { updateInventoryStep } from "../steps/update-inventory"

type ReceivePurchaseOrderWorkflowInput = {
  purchase_order_id: string
  items: {
    purchase_order_item_id: string
    quantity_received: number
    received_date?: Date
    notes?: string
  }[]
  received_by?: string
}

export const receivePurchaseOrderWorkflow = createWorkflow(
  "receive-purchase-order-workflow", 
  (input: ReceivePurchaseOrderWorkflowInput) => {
    const { purchaseOrder } = receivePurchaseOrderStep(input)
    
    // Update inventory for received items
    const { inventoryUpdates } = updateInventoryStep({
      purchase_order_id: input.purchase_order_id,
      items: input.items
    })

    return new WorkflowResponse({ 
      purchaseOrder, 
      inventoryUpdates 
    })
  }
) 