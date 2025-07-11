import { createWorkflow, WorkflowResponse } from "@medusajs/workflows-sdk"
import { when } from "@medusajs/workflows-sdk"
import { createPurchaseOrderStep } from "../steps/create-purchase-order"
import { validateSupplierStep } from "../steps/validate-supplier"
import { validateProductVariantsStep } from "../steps/validate-product-variants"
import { sendPurchaseOrderEmailStep } from "../steps/send-purchase-order-email"

type CreatePurchaseOrderWorkflowInput = {
  supplier_id: string
  expected_delivery_date?: Date
  priority?: "low" | "normal" | "high" | "urgent"
  payment_terms?: string
  delivery_address?: any
  billing_address?: any
  notes?: string
  internal_notes?: string
  created_by?: string
  send_email?: boolean
  items: {
    product_variant_id: string
    supplier_product_id?: string
    quantity_ordered: number
    unit_cost: number
  }[]
}

export const createPurchaseOrderWorkflow = createWorkflow(
  "create-purchase-order-workflow",
  (input: CreatePurchaseOrderWorkflowInput) => {
    // Validate inputs
    const { supplier } = validateSupplierStep({
      supplier_id: input.supplier_id
    })
    
    const { validatedItems } = validateProductVariantsStep({
      items: input.items
    })

    // Create the purchase order
    const { purchaseOrder } = createPurchaseOrderStep({
      ...input,
      items: validatedItems
    })

    // Conditionally send email
    when({ send_email: input.send_email }, ({ send_email }) => {
      return sendPurchaseOrderEmailStep({
        purchase_order_id: purchaseOrder.id,
        supplier_email: supplier.email
      })
    })

    return new WorkflowResponse(purchaseOrder)
  }
) 