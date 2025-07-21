import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { createInvoiceWithPdfFromOrderWorkflow } from "../workflows/invoicing/create-invoice-with-pdf-from-order"

export default async function orderShippedInvoiceHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderId = data.id

  try {
    // Execute the workflow to create invoice and PDF
    const { result } = await createInvoiceWithPdfFromOrderWorkflow(container)
      .run({
        input: {
          order_id: orderId,
          invoice_type: "product_sale",
          payment_terms: "30 dagen",
          notes: "Automatisch gegenereerde factuur bij verzending",
          created_by: "system"
        }
      })

    console.log(`Invoice created for shipped order ${orderId}:`, result.invoice.invoice_number)
  } catch (error) {
    console.error(`Failed to create invoice for shipped order ${orderId}:`, error)
    throw error
  }
}

export const config: SubscriberConfig = {
  event: "order.shipment_created",
}