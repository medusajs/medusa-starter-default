import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { INVOICING_MODULE } from "../../../modules/invoicing"

export const deleteLineItemStep = createStep(
  "delete-line-item",
  async (line_item_id: string, { container }) => {
    const invoicingService = container.resolve(INVOICING_MODULE)

    // Get line item data for compensation
    const lineItem = await invoicingService.retrieveInvoiceLineItem(line_item_id)

    // Delete the line item
    await invoicingService.deleteInvoiceLineItems([line_item_id])

    return new StepResponse({ success: true }, {
      deleted_line_item: lineItem,
    })
  },
  async (compensationData, { container }) => {
    if (!compensationData?.deleted_line_item) return

    const invoicingService = container.resolve(INVOICING_MODULE)
    const lineItem = compensationData.deleted_line_item

    // Restore the deleted line item
    await invoicingService.createInvoiceLineItems({
      id: lineItem.id,
      invoice_id: lineItem.invoice_id,
      item_type: lineItem.item_type,
      product_id: lineItem.product_id,
      variant_id: lineItem.variant_id,
      title: lineItem.title,
      description: lineItem.description,
      sku: lineItem.sku,
      quantity: lineItem.quantity,
      unit_price: lineItem.unit_price,
      discount_amount: lineItem.discount_amount,
      tax_rate: lineItem.tax_rate,
      total_price: lineItem.total_price,
      tax_amount: lineItem.tax_amount,
      hours_worked: lineItem.hours_worked,
      hourly_rate: lineItem.hourly_rate,
      notes: lineItem.notes,
    })
  }
)
