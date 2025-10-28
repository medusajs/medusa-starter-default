import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { INVOICING_MODULE } from "../../../modules/invoicing"
import { InvoiceStatus } from "../../../modules/invoicing/models/invoice"

type CancelSourceInvoicesInput = {
  invoice_ids: string[]
  merged_invoice_id: string
  merged_invoice_number: string
  cancelled_by: string
}

export const cancelSourceInvoicesStep = createStep(
  "cancel-source-invoices",
  async (
    { invoice_ids, merged_invoice_id, merged_invoice_number, cancelled_by }: CancelSourceInvoicesInput,
    { container }
  ) => {
    const invoicingService = container.resolve(INVOICING_MODULE)

    const cancelledInvoices: any[] = []
    const statusHistoryEntries: any[] = []

    const cancelledAt = new Date()

    // Process each source invoice
    for (const invoiceId of invoice_ids) {
      // Get the current invoice to preserve state for compensation
      const currentInvoice = await invoicingService.retrieveInvoice(invoiceId)

      // Prepare metadata for cancelled invoice
      const cancelledMetadata = {
        ...(currentInvoice.metadata || {}),
        cancelled_reason: "merged",
        merged_into_invoice_id: merged_invoice_id,
        merged_into_invoice_number: merged_invoice_number,
        cancelled_at: cancelledAt.toISOString(),
      }

      // Update invoice status to cancelled
      const updatedInvoice = await invoicingService.updateInvoices(
        {
          id: invoiceId,
          status: InvoiceStatus.CANCELLED,
          metadata: cancelledMetadata,
        },
        { id: invoiceId }
      )

      cancelledInvoices.push({
        id: invoiceId,
        previous_status: currentInvoice.status,
        previous_metadata: currentInvoice.metadata,
      })

      // Create status history entry
      const statusHistory = await invoicingService.createInvoiceStatusHistories({
        invoice_id: invoiceId,
        from_status: currentInvoice.status,
        to_status: InvoiceStatus.CANCELLED,
        changed_by: cancelled_by,
        changed_at: cancelledAt,
        reason: `Merged into invoice ${merged_invoice_number}`,
      })

      statusHistoryEntries.push(statusHistory)
    }

    return new StepResponse(
      {
        cancelled_count: cancelledInvoices.length,
        cancelled_invoice_ids: invoice_ids,
      },
      {
        // Compensation data: store previous states for rollback
        cancelled_invoices: cancelledInvoices,
        status_history_ids: statusHistoryEntries.map(sh => sh.id),
      }
    )
  },
  async (compensationData, { container }) => {
    if (!compensationData?.cancelled_invoices?.length) return

    const invoicingService = container.resolve(INVOICING_MODULE)

    try {
      // Revert each invoice back to its previous state
      for (const invoiceData of compensationData.cancelled_invoices) {
        await invoicingService.updateInvoices(
          {
            id: invoiceData.id,
            status: invoiceData.previous_status,
            metadata: invoiceData.previous_metadata,
          },
          { id: invoiceData.id }
        )
      }

      // Delete the status history entries that were created
      if (compensationData.status_history_ids?.length > 0) {
        await invoicingService.deleteInvoiceStatusHistories(
          compensationData.status_history_ids
        )
      }
    } catch (error) {
      console.error("Error during cancel-source-invoices compensation:", error)
      // Don't throw - compensation should be best effort
    }
  }
)

