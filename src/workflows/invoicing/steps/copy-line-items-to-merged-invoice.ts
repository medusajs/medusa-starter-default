import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MathBN } from "@medusajs/framework/utils"
import { INVOICING_MODULE } from "../../../modules/invoicing"

type CopyLineItemsToMergedInvoiceInput = {
  invoices: any[]
  merged_invoice_id: string
}

export const copyLineItemsToMergedInvoiceStep = createStep(
  "copy-line-items-to-merged-invoice",
  async (
    { invoices, merged_invoice_id }: CopyLineItemsToMergedInvoiceInput,
    { container }
  ) => {
    const invoicingService = container.resolve(INVOICING_MODULE)

    const createdLineItems: any[] = []

    // Process each source invoice in order
    for (const sourceInvoice of invoices) {
      // Get all line items for this invoice
      const sourceLineItems = await invoicingService.listInvoiceLineItems({
        invoice_id: sourceInvoice.id,
      })

      // Copy each line item to the merged invoice
      for (const sourceLineItem of sourceLineItems) {
        // Prepare metadata with source reference
        const lineItemMetadata = {
          ...(sourceLineItem.metadata || {}),
          source_invoice_id: sourceInvoice.id,
          source_invoice_number: sourceInvoice.invoice_number,
        }

        // Recalculate totals using MathBN for precision
        const quantity = sourceLineItem.quantity || 0
        const unitPrice = sourceLineItem.unit_price || 0
        const discountAmount = sourceLineItem.discount_amount || 0
        const taxRate = sourceLineItem.tax_rate || 0

        // Calculate: subtotal = quantity * unit_price
        const subtotal = MathBN.mult(quantity, unitPrice)
        
        // Calculate: total_price = subtotal - discount
        const totalPrice = MathBN.sub(subtotal, discountAmount)
        
        // Calculate: tax_amount = total_price * tax_rate
        const taxAmount = MathBN.mult(totalPrice, taxRate)

        // Create new line item in merged invoice
        const newLineItem = await invoicingService.createInvoiceLineItems({
          invoice_id: merged_invoice_id,
          item_type: sourceLineItem.item_type,
          product_id: sourceLineItem.product_id,
          variant_id: sourceLineItem.variant_id,
          service_order_item_id: sourceLineItem.service_order_item_id,
          service_order_time_entry_id: sourceLineItem.service_order_time_entry_id,
          title: sourceLineItem.title,
          description: sourceLineItem.description,
          sku: sourceLineItem.sku,
          quantity: quantity,
          unit_price: unitPrice,
          total_price: totalPrice.toNumber(),
          discount_amount: discountAmount,
          tax_rate: taxRate,
          tax_amount: taxAmount.toNumber(),
          hours_worked: sourceLineItem.hours_worked,
          hourly_rate: sourceLineItem.hourly_rate,
          notes: sourceLineItem.notes,
          metadata: lineItemMetadata,
        })

        createdLineItems.push(newLineItem)
      }
    }

    // Calculate invoice totals using MathBN
    const subtotal = MathBN.sum(
      ...createdLineItems.map(item => 
        MathBN.mult(item.unit_price || 0, item.quantity || 0)
      )
    )

    const discountAmount = MathBN.sum(
      ...createdLineItems.map(item => item.discount_amount || 0)
    )

    const taxAmount = MathBN.sum(
      ...createdLineItems.map(item => item.tax_amount || 0)
    )

    // Total = subtotal - discount + tax
    const subtotalAfterDiscount = MathBN.sub(subtotal, discountAmount)
    const totalAmount = MathBN.add(subtotalAfterDiscount, taxAmount)

    // Update merged invoice with calculated totals
    await invoicingService.updateInvoices(
      {
        id: merged_invoice_id,
        subtotal: subtotal.toNumber(),
        tax_amount: taxAmount.toNumber(),
        discount_amount: discountAmount.toNumber(),
        total_amount: totalAmount.toNumber(),
      },
      { id: merged_invoice_id }
    )

    return new StepResponse(
      {
        line_items_created: createdLineItems.length,
        total_amount: totalAmount.toNumber(),
      },
      {
        // Compensation data: store created line item IDs for rollback
        created_line_item_ids: createdLineItems.map(item => item.id),
        merged_invoice_id: merged_invoice_id,
      }
    )
  },
  async (compensationData, { container }) => {
    if (!compensationData?.created_line_item_ids?.length) return

    const invoicingService = container.resolve(INVOICING_MODULE)

    try {
      // Delete all created line items
      await invoicingService.deleteInvoiceLineItems(
        compensationData.created_line_item_ids
      )

      // Reset invoice totals to 0
      if (compensationData.merged_invoice_id) {
        await invoicingService.updateInvoices(
          {
            id: compensationData.merged_invoice_id,
            subtotal: 0,
            tax_amount: 0,
            discount_amount: 0,
            total_amount: 0,
          },
          { id: compensationData.merged_invoice_id }
        )
      }
    } catch (error) {
      console.error("Error during copy-line-items-to-merged-invoice compensation:", error)
      // Don't throw - compensation should be best effort
    }
  }
)

