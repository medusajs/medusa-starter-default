import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { INVOICING_MODULE } from "../../../modules/invoicing"

export const updateLineItemStep = createStep(
  "update-line-item",
  async (input: any, { container }) => {
    const invoicingService = container.resolve(INVOICING_MODULE)

    // Get current line item for compensation
    const currentLineItem = await invoicingService.retrieveInvoiceLineItem(
      input.line_item_id
    )

    // Build update data
    const updateData: any = {}

    if (input.item_type !== undefined) updateData.item_type = input.item_type
    if (input.title !== undefined) updateData.title = input.title
    if (input.description !== undefined) updateData.description = input.description
    if (input.sku !== undefined) updateData.sku = input.sku
    if (input.quantity !== undefined) updateData.quantity = input.quantity
    if (input.unit_price !== undefined) updateData.unit_price = input.unit_price
    if (input.discount_amount !== undefined) updateData.discount_amount = input.discount_amount
    if (input.tax_rate !== undefined) updateData.tax_rate = input.tax_rate
    if (input.hours_worked !== undefined) updateData.hours_worked = input.hours_worked
    if (input.hourly_rate !== undefined) updateData.hourly_rate = input.hourly_rate
    if (input.notes !== undefined) updateData.notes = input.notes

    // Recalculate totals if quantity, unit_price, discount, or tax changed
    const quantity = input.quantity ?? currentLineItem.quantity
    const unitPrice = input.unit_price ?? currentLineItem.unit_price
    const discountAmount = input.discount_amount ?? currentLineItem.discount_amount ?? 0
    const taxRate = input.tax_rate ?? currentLineItem.tax_rate ?? 0.21

    updateData.total_price = quantity * unitPrice - discountAmount
    updateData.tax_amount = updateData.total_price * taxRate

    const updatedLineItem = await invoicingService.updateInvoiceLineItems(
      updateData,
      { id: input.line_item_id }
    )

    return new StepResponse(updatedLineItem, {
      line_item_id: input.line_item_id,
      previous_data: currentLineItem,
    })
  },
  async (compensationData, { container }) => {
    if (!compensationData) return

    const invoicingService = container.resolve(INVOICING_MODULE)

    // Restore previous values
    await invoicingService.updateInvoiceLineItems(
      {
        item_type: compensationData.previous_data.item_type,
        title: compensationData.previous_data.title,
        description: compensationData.previous_data.description,
        sku: compensationData.previous_data.sku,
        quantity: compensationData.previous_data.quantity,
        unit_price: compensationData.previous_data.unit_price,
        discount_amount: compensationData.previous_data.discount_amount,
        tax_rate: compensationData.previous_data.tax_rate,
        hours_worked: compensationData.previous_data.hours_worked,
        hourly_rate: compensationData.previous_data.hourly_rate,
        notes: compensationData.previous_data.notes,
        total_price: compensationData.previous_data.total_price,
        tax_amount: compensationData.previous_data.tax_amount,
      },
      { id: compensationData.line_item_id }
    )
  }
)
