import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MathBN } from "@medusajs/framework/utils"
import { INVOICING_MODULE } from "../../../modules/invoicing"

export const addLineItemStep = createStep(
  "add-line-item",
  async (input: any, { container }) => {
    const invoicingService = container.resolve(INVOICING_MODULE)

    // Validate required fields
    if (!input.title) {
      throw new Error('Title is required for line item')
    }

    if (!input.quantity || input.quantity <= 0) {
      throw new Error('Quantity must be greater than 0')
    }

    if (input.unit_price === undefined || input.unit_price === null) {
      throw new Error('Unit price is required')
    }

    // Calculate totals using MathBN for proper BigNumber arithmetic
    const subtotal = MathBN.mult(input.quantity, input.unit_price)
    const totalPrice = MathBN.sub(subtotal, input.discount_amount || 0)
    const taxAmount = MathBN.mult(totalPrice, input.tax_rate || 0.21)

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
      total_price: totalPrice.toNumber(),
      tax_amount: taxAmount.toNumber(),
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
