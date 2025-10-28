import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { INVOICING_MODULE } from "../../../modules/invoicing"
import { InvoiceStatus, InvoiceType } from "../../../modules/invoicing/models/invoice"

type CreateMergedInvoiceInput = {
  invoices: any[]
  customer_id: string
  currency_code: string
  merged_by: string
  notes?: string
  payment_terms?: string
}

export const createMergedInvoiceStep = createStep(
  "create-merged-invoice",
  async (
    { invoices, customer_id, currency_code, merged_by, notes, payment_terms }: CreateMergedInvoiceInput,
    { container }
  ) => {
    const invoicingService = container.resolve(INVOICING_MODULE)

    // Use the first invoice as the template for customer details
    const templateInvoice = invoices[0]

    // Determine invoice type based on source invoices
    const invoiceTypes = [...new Set(invoices.map(inv => inv.invoice_type))]
    let mergedInvoiceType: string
    
    if (invoiceTypes.length === 1) {
      mergedInvoiceType = invoiceTypes[0]
    } else {
      // If multiple types, mark as mixed
      mergedInvoiceType = InvoiceType.MIXED
    }

    // Generate new invoice number
    const invoiceNumber = await invoicingService.generateInvoiceNumber()

    // Set dates
    const invoiceDate = new Date()
    let dueDate: Date
    
    if (payment_terms) {
      // Parse payment terms if provided (e.g., "NET30" means 30 days)
      const days = parseInt(payment_terms.replace(/\D/g, '')) || 30
      dueDate = new Date(invoiceDate.getTime() + (days * 24 * 60 * 60 * 1000))
    } else {
      // Default to 30 days
      dueDate = new Date(invoiceDate.getTime() + (30 * 24 * 60 * 60 * 1000))
    }

    // Prepare merge notes
    const sourceInvoiceNumbers = invoices.map(inv => inv.invoice_number).join(", ")
    const mergeNote = `Merged from invoices: ${sourceInvoiceNumbers}`
    const finalNotes = notes ? `${mergeNote}\n\n${notes}` : mergeNote

    // Prepare metadata
    const metadata = {
      merged_from: invoices.map(inv => inv.id),
      merged_from_numbers: invoices.map(inv => inv.invoice_number),
      merged_at: invoiceDate.toISOString(),
      merged_by: merged_by,
    }

    // Create the merged invoice
    const mergedInvoice = await invoicingService.createInvoices({
      invoice_number: invoiceNumber,
      customer_id: customer_id,
      invoice_type: mergedInvoiceType,
      status: InvoiceStatus.DRAFT,
      invoice_date: invoiceDate,
      due_date: dueDate,
      currency_code: currency_code,
      billing_address: templateInvoice.billing_address,
      shipping_address: templateInvoice.shipping_address,
      customer_email: templateInvoice.customer_email,
      customer_phone: templateInvoice.customer_phone,
      notes: finalNotes,
      payment_terms: payment_terms || templateInvoice.payment_terms,
      created_by: merged_by,
      metadata: metadata,
      // Initialize totals to 0, will be recalculated after line items are added
      subtotal: 0,
      tax_amount: 0,
      discount_amount: 0,
      total_amount: 0,
    })

    // Create initial status history entry
    await invoicingService.createInvoiceStatusHistories({
      invoice_id: mergedInvoice.id,
      to_status: InvoiceStatus.DRAFT,
      changed_by: merged_by,
      changed_at: invoiceDate,
      reason: `Invoice created from merge of ${invoices.length} invoices`,
    })

    return new StepResponse(
      {
        merged_invoice: mergedInvoice,
      },
      {
        // Compensation data: store invoice ID for rollback
        invoice_id: mergedInvoice.id,
        status_history_created: true,
      }
    )
  },
  async (compensationData, { container }) => {
    if (!compensationData?.invoice_id) return

    const invoicingService = container.resolve(INVOICING_MODULE)

    try {
      // Delete status history entries for this invoice
      const statusHistories = await invoicingService.listInvoiceStatusHistories({
        invoice_id: compensationData.invoice_id,
      })

      if (statusHistories.length > 0) {
        await invoicingService.deleteInvoiceStatusHistories(
          statusHistories.map(sh => sh.id)
        )
      }

      // Delete the created invoice
      await invoicingService.deleteInvoices([compensationData.invoice_id])
    } catch (error) {
      console.error("Error during create-merged-invoice compensation:", error)
      // Don't throw - compensation should be best effort
    }
  }
)

