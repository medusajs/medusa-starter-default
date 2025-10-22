import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { generatePurchaseOrderCsvStep } from "../steps/generate-purchase-order-csv"

type WorkflowInput = {
  purchase_order: any
}

export const exportPurchaseOrderCsvWorkflow = createWorkflow(
  "export-purchase-order-csv",
  (input: WorkflowInput) => {
    const fileResult = generatePurchaseOrderCsvStep({
      purchase_order: input.purchase_order,
    })

    return new WorkflowResponse(fileResult)
  }
)
