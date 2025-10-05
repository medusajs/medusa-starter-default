import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateLineItemWorkflow } from "../../../../../../workflows/invoicing/update-line-item-workflow"
import { deleteLineItemWorkflow } from "../../../../../../workflows/invoicing/delete-line-item-workflow"

interface UpdateLineItemRequest {
  item_type?: "product" | "service" | "labor" | "shipping" | "discount"
  title?: string
  description?: string
  sku?: string
  quantity?: number
  unit_price?: number
  discount_amount?: number
  tax_rate?: number
  hours_worked?: number
  hourly_rate?: number
  notes?: string
}

export const POST = async (
  req: AuthenticatedMedusaRequest<UpdateLineItemRequest>,
  res: MedusaResponse
) => {
  const { id: invoiceId, line_item_id: lineItemId } = req.params

  try {
    const { result } = await updateLineItemWorkflow(req.scope).run({
      input: {
        invoice_id: invoiceId,
        line_item_id: lineItemId,
        ...req.validatedBody,
      }
    })

    res.json({ line_item: result })
  } catch (error: any) {
    res.status(error.type === "not_found" ? 404 : 400).json({
      error: error.message,
    })
  }
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id: invoiceId, line_item_id: lineItemId } = req.params

  try {
    await deleteLineItemWorkflow(req.scope).run({
      input: {
        invoice_id: invoiceId,
        line_item_id: lineItemId,
      }
    })

    res.status(200).json({ success: true })
  } catch (error: any) {
    res.status(error.type === "not_found" ? 404 : 400).json({
      error: error.message,
    })
  }
}
