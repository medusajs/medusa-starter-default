import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { INVOICING_MODULE } from "../../../modules/invoicing"

export const addLineItemStep = createStep(
  "add-line-item",
  async (input: any, { container }) => {
    const invoicingService = container.resolve(INVOICING_MODULE)

    const lineItem = await invoicingService.createInvoiceLineItems({
      invoice_id: input.invoice_id,
      item_type: input.item_type || 'product',
      product_id: input.product_id,
      variant_id: input.variant_id,
      title: input.title,
      description: input.description,
      sku: input.sku,
      quantity: input.quantity,
      unit_price: input.unit_price,
      discount_amount: input.discount_amount || 0,
      tax_rate: input.tax_rate || 0.21,
      hours_worked: input.hours_worked,
      hourly_rate: input.hourly_rate,
      notes: input.notes,
      // Calculate totals
      total_price: input.quantity * input.unit_price - (input.discount_amount || 0),
      tax_amount: (input.quantity * input.unit_price - (input.discount_amount || 0)) * (input.tax_rate || 0.21),
    })

    return new StepResponse(lineItem, {
      line_item_id: lineItem.id,
      invoice_id: input.invoice_id,
    })
  },
  async (compensationData, { container }) => {
    if (!compensationData) return

    const invoicingService = container.resolve(INVOICING_MODULE)
    await invoicingService.deleteInvoiceLineItems([compensationData.line_item_id])
  }
)
