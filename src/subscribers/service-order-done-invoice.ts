import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { createInvoiceFromServiceOrderWorkflow } from "../workflows/invoicing/create-invoice-from-service-order"

export default async function serviceOrderDoneInvoiceHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string; status: string }>) {
  // Only trigger when status changes to 'done'
  if (data.status !== 'done') {
    return
  }

  const serviceOrderId = data.id

  if (!serviceOrderId) {
    console.log('No service_order_id found in event data')
    return
  }

  try {
    const { result } = await createInvoiceFromServiceOrderWorkflow(container).run({
      input: {
        service_order_id: serviceOrderId,
        invoice_type: "service_work",
        payment_terms: "30 dagen",
        notes: "Automatisch gegenereerde factuur bij voltooiing serviceorder",
        created_by: "system"
      }
    })

    console.log(`Invoice created for service order ${serviceOrderId}:`, result.invoice_number)
  } catch (error) {
    console.error(`Failed to create invoice for service order ${serviceOrderId}:`, error)
    throw error
  }
}

export const config: SubscriberConfig = {
  event: "service_order.updated",
  context: {
    subscriberId: "service-order-done-invoice-handler",
  },
}
