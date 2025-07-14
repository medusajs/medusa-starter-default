import { 
  createStep, 
  StepResponse 
} from "@medusajs/framework/workflows-sdk"
import { 
  Modules, 
  ContainerRegistrationKeys 
} from "@medusajs/framework/utils"
import { INVOICING_MODULE } from "../../../modules/invoicing"

type ConvertOrderToInvoiceInput = {
  order_id: string
  invoice_type?: "product_sale" | "mixed"
  due_date?: Date
  payment_terms?: string
  notes?: string
  created_by?: string
}

export const convertOrderToInvoiceStep = createStep(
  "convert-order-to-invoice",
  async (input: ConvertOrderToInvoiceInput, { container }) => {
    const invoicingService = container.resolve(INVOICING_MODULE)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    
    // Fetch order with full details using Remote Query
    const { data: [order] } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "customer_id", 
        "email",
        "currency_code",
        "total",
        "subtotal",
        "tax_total",
        "shipping_total",
        "billing_address.*",
        "shipping_address.*",
        "items.*",
        "shipping_methods.*",
        "customer.first_name",
        "customer.last_name",
        "customer.email",
        "customer.phone",
      ],
      filters: {
        id: input.order_id,
      },
    })
    
    if (!order) {
      throw new Error(`Order ${input.order_id} not found`)
    }
    
    // Create the invoice
    const invoice = await invoicingService.createInvoiceWithNumber({
      customer_id: order.customer_id,
      order_id: order.id,
      invoice_type: input.invoice_type || "product_sale",
      due_date: input.due_date,
      currency_code: order.currency_code,
      billing_address: order.billing_address,
      shipping_address: order.shipping_address,
      customer_email: order.customer?.email || order.email,
      customer_phone: order.customer?.phone,
      notes: input.notes,
      payment_terms: input.payment_terms,
      created_by: input.created_by,
    })
    
    // Add line items for products
    for (const item of order.items || []) {
      await invoicingService.addLineItemToInvoice({
        invoice_id: invoice.id,
        item_type: "product",
        product_id: item.product_id,
        variant_id: item.variant_id,
        title: item.title,
        description: item.subtitle,
        sku: item.variant_sku,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        tax_rate: Number(item.tax_total) / Number(item.subtotal) || 0,
      })
    }
    
    // Add shipping as line item if present
    for (const shippingMethod of order.shipping_methods || []) {
      if (Number(shippingMethod.amount) > 0) {
        await invoicingService.addLineItemToInvoice({
          invoice_id: invoice.id,
          item_type: "shipping",
          title: shippingMethod.name,
          description: shippingMethod.description,
          quantity: 1,
          unit_price: Number(shippingMethod.amount),
          tax_rate: Number(shippingMethod.tax_total) / Number(shippingMethod.subtotal) || 0,
        })
      }
    }
    
    // Recalculate totals to ensure accuracy
    await invoicingService.recalculateInvoiceTotals(invoice.id)
    
    return new StepResponse(invoice, invoice.id)
  },
  async (invoiceId: string, { container }) => {
    // Compensation: delete the created invoice if workflow fails
    if (!invoiceId) return
    
    const invoicingService = container.resolve(INVOICING_MODULE)
    await invoicingService.deleteInvoices([invoiceId])
  }
) 