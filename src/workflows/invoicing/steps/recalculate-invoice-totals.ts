import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MathBN } from "@medusajs/framework/utils"
import { INVOICING_MODULE } from "../../../modules/invoicing"

export const recalculateInvoiceTotalsStep = createStep(
  "recalculate-invoice-totals",
  async (invoice_id: string, { container }) => {
    const invoicingService = container.resolve(INVOICING_MODULE)

    const lineItems = await invoicingService.listInvoiceLineItems({
      invoice_id,
    })

    // Calculate subtotal from unit_price * quantity (before discounts)
    // Use MathBN.sum for proper BigNumber handling
    const subtotal = MathBN.sum(
      ...lineItems.map(item => MathBN.mult(item.unit_price || 0, item.quantity || 0))
    )
    
    const discountAmount = MathBN.sum(
      ...lineItems.map(item => item.discount_amount || 0)
    )
    
    const taxAmount = MathBN.sum(
      ...lineItems.map(item => item.tax_amount || 0)
    )

    // Total = subtotal - discount + tax
    const subtotalAfterDiscount = MathBN.sub(subtotal, discountAmount)
    const totalAmount = MathBN.add(subtotalAfterDiscount, taxAmount)

    const updatedInvoice = await invoicingService.updateInvoices(
      {
        id: invoice_id,
        subtotal: subtotal.toNumber(),
        tax_amount: taxAmount.toNumber(),
        discount_amount: discountAmount.toNumber(),
        total_amount: totalAmount.toNumber(),
      },
      { id: invoice_id }
    )

    return new StepResponse(updatedInvoice)
  }
)
