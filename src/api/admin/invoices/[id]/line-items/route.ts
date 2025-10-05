import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { addLineItemWorkflow } from "../../../../../workflows/invoicing/add-line-item-workflow"

interface CreateLineItemRequest {
  item_type?: "product" | "service" | "labor" | "shipping" | "discount"
  product_id?: string
  variant_id?: string
  title: string
  description?: string
  sku?: string
  quantity: number
  unit_price: number
  discount_amount?: number
  tax_rate?: number
  hours_worked?: number
  hourly_rate?: number
  notes?: string
}

export const POST = async (
  req: AuthenticatedMedusaRequest<CreateLineItemRequest>,
  res: MedusaResponse
) => {
  const invoiceId = req.params.id

  try {
    const { result } = await addLineItemWorkflow(req.scope).run({
      input: {
        invoice_id: invoiceId,
        ...req.validatedBody,
      }
    })

    res.status(201).json({ line_item: result })
  } catch (error: any) {
    res.status(error.type === "not_found" ? 404 : 400).json({
      error: error.message,
    })
  }
}
