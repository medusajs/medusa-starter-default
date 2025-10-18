import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { INVOICING_MODULE } from "../../../modules/invoicing"

export const deleteInvoiceStep = createStep(
  "delete-invoice",
  async (invoice_id: string, { container }) => {
    const invoicingService = container.resolve(INVOICING_MODULE)

    // Get invoice data for compensation (including related data)
    const invoice = await invoicingService.retrieveInvoice(invoice_id)

    // Only allow deletion of draft invoices
    if (invoice.status !== "draft") {
      throw new Error("Only draft invoices can be deleted")
    }

    // Get all related data before deletion for potential rollback
    const lineItems = await invoicingService.listInvoiceLineItems({
      invoice_id
    })

    const statusHistory = await invoicingService.listInvoiceStatusHistories({
      invoice_id
    })

    // Delete in correct order: first related entities, then the invoice
    // Delete all line items
    if (lineItems.length > 0) {
      await invoicingService.deleteInvoiceLineItems(
        lineItems.map(item => item.id)
      )
    }

    // Delete all status history entries
    if (statusHistory.length > 0) {
      await invoicingService.deleteInvoiceStatusHistories(
        statusHistory.map(history => history.id)
      )
    }

    // Finally delete the invoice itself
    await invoicingService.deleteInvoices([invoice_id])

    return new StepResponse(
      {
        success: true,
        invoice_number: invoice.invoice_number
      },
      {
        deleted_invoice: invoice,
        deleted_line_items: lineItems,
        deleted_status_history: statusHistory,
      }
    )
  },
  async (compensationData, { container }) => {
    if (!compensationData?.deleted_invoice) return

    const invoicingService = container.resolve(INVOICING_MODULE)
    const { deleted_invoice, deleted_line_items, deleted_status_history } = compensationData

    // Restore the invoice
    await invoicingService.createInvoices({
      id: deleted_invoice.id,
      invoice_number: deleted_invoice.invoice_number,
      customer_id: deleted_invoice.customer_id,
      order_id: deleted_invoice.order_id,
      service_order_id: deleted_invoice.service_order_id,
      invoice_type: deleted_invoice.invoice_type,
      status: deleted_invoice.status,
      invoice_date: deleted_invoice.invoice_date,
      due_date: deleted_invoice.due_date,
      sent_date: deleted_invoice.sent_date,
      paid_date: deleted_invoice.paid_date,
      subtotal: deleted_invoice.subtotal,
      tax_amount: deleted_invoice.tax_amount,
      discount_amount: deleted_invoice.discount_amount,
      total_amount: deleted_invoice.total_amount,
      currency_code: deleted_invoice.currency_code,
      billing_address: deleted_invoice.billing_address,
      shipping_address: deleted_invoice.shipping_address,
      customer_email: deleted_invoice.customer_email,
      customer_phone: deleted_invoice.customer_phone,
      notes: deleted_invoice.notes,
      internal_notes: deleted_invoice.internal_notes,
      payment_terms: deleted_invoice.payment_terms,
      pdf_file_id: deleted_invoice.pdf_file_id,
      created_by: deleted_invoice.created_by,
      metadata: deleted_invoice.metadata,
    })

    // Restore line items
    if (deleted_line_items && deleted_line_items.length > 0) {
      for (const lineItem of deleted_line_items) {
        await invoicingService.createInvoiceLineItems({
          id: lineItem.id,
          invoice_id: lineItem.invoice_id,
          item_type: lineItem.item_type,
          product_id: lineItem.product_id,
          variant_id: lineItem.variant_id,
          service_order_item_id: lineItem.service_order_item_id,
          service_order_time_entry_id: lineItem.service_order_time_entry_id,
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
          metadata: lineItem.metadata,
        })
      }
    }

    // Restore status history
    if (deleted_status_history && deleted_status_history.length > 0) {
      for (const history of deleted_status_history) {
        await invoicingService.createInvoiceStatusHistories({
          id: history.id,
          invoice_id: history.invoice_id,
          from_status: history.from_status,
          to_status: history.to_status,
          changed_by: history.changed_by,
          changed_at: history.changed_at,
          reason: history.reason,
        })
      }
    }
  }
)
