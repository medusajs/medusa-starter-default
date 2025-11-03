import { createWorkflow, WorkflowResponse } from "@medusajs/workflows-sdk"
import { addItemToDraftPurchaseOrderStep } from "../steps/add-item-to-draft-po"

type WorkflowInput = {
  supplier_id: string
  type?: "stock" | "rush"
  item: {
    product_variant_id: string
    quantity: number
    unit_price: number
  }
}

export const addItemToDraftPurchaseOrderWorkflow = createWorkflow(
  "add-item-to-draft-purchase-order-workflow",
  (input: WorkflowInput) => {
    const { createdItem } = addItemToDraftPurchaseOrderStep(input)
    return new WorkflowResponse(createdItem)
  }
) 