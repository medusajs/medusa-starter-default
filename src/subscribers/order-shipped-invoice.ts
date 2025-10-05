import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { 
  Modules,
  ContainerRegistrationKeys 
} from "@medusajs/framework/utils"
import { createInvoiceFromOrderWorkflow } from "../workflows/invoicing/create-invoice-from-order"

export default async function orderShippedInvoiceHandler({
  event: { data },
  container,
}: SubscriberArgs<{ order_id: string; fulfillment_id: string; no_notification?: boolean }>) {
  console.log('Event data received:', JSON.stringify(data, null, 2))
  
  // The data already contains order_id directly
  const orderId = data.order_id
  const fulfillmentId = data.fulfillment_id

  if (!orderId) {
    console.log(`No order_id found in event data`)
    return
  }

  try {
    // Execute the workflow to create invoice (without PDF for now)
    const { result } = await createInvoiceFromOrderWorkflow(container)
      .run({
        input: {
          order_id: orderId,
          invoice_type: "product_sale",
          payment_terms: "30 dagen",
          notes: "Automatisch gegenereerde factuur bij fulfillment",
          created_by: "system"
        }
      })

    console.log(`Invoice created for shipped order ${orderId}:`, result.invoice_number)
  } catch (error) {
    console.error(`Failed to create invoice for fulfillment ${fulfillmentId}:`, error)
    throw error
  }
}

export const config: SubscriberConfig = {
  event: "order.fulfillment_created",
}