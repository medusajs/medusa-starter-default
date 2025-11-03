import { createWorkflow, WorkflowResponse } from "@medusajs/workflows-sdk"
import { createPurchaseOrderStep } from "../steps/create-purchase-order"

type CreatePurchaseOrderWorkflowInput = {
  supplier_id: string
  expected_delivery_date?: Date
  priority?: "low" | "normal" | "high" | "urgent"
  type?: "stock" | "rush"
  payment_terms?: string
  delivery_address?: any
  billing_address?: any
  notes?: string
  internal_notes?: string
  created_by?: string
  items: {
    product_variant_id: string
    supplier_product_id?: string
    supplier_sku?: string
    product_title?: string
    product_variant_title?: string
    quantity_ordered: number
    unit_cost: number
  }[]
}

export const createPurchaseOrderWorkflow = createWorkflow(
  "create-purchase-order-workflow",
  (input: CreatePurchaseOrderWorkflowInput) => {
    // Create the purchase order directly
    const { purchaseOrder } = createPurchaseOrderStep(input)

    return new WorkflowResponse(purchaseOrder)
  }
) 