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
  const body = req.body as CreateLineItemRequest

  try {
    // Validate required fields
    if (!body.title || body.title.trim() === '') {
      return res.status(400).json({
        error: "Title is required"
      })
    }

    if (!body.quantity || body.quantity <= 0) {
      return res.status(400).json({
        error: "Quantity must be greater than 0"
      })
    }

    if (body.unit_price === undefined || body.unit_price === null) {
      return res.status(400).json({
        error: "Unit price is required"
      })
    }

    const { result } = await addLineItemWorkflow(req.scope).run({
      input: {
        invoice_id: invoiceId,
        ...body,
      }
    })

    res.status(201).json({ line_item: result })
  } catch (error: any) {
    res.status(error.type === "not_found" ? 404 : 400).json({
      error: error.message,
    })
  }
}
