import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { validateInvoicesMergeableStep } from "./steps/validate-invoices-mergeable"
import { createMergedInvoiceStep } from "./steps/create-merged-invoice"
import { copyLineItemsToMergedInvoiceStep } from "./steps/copy-line-items-to-merged-invoice"
import { cancelSourceInvoicesStep } from "./steps/cancel-source-invoices"

export interface MergeInvoicesInput {
  invoice_ids: string[]
  merged_by: string
  notes?: string
  payment_terms?: string
}

export const mergeInvoicesWorkflowId = "merge-invoices"

/**
 * Workflow to merge multiple invoices from the same customer into a single consolidated invoice.
 * 
 * This workflow:
 * 1. Validates that all invoices can be merged (same customer, draft status, same currency)
 * 2. Creates a new merged invoice with proper metadata
 * 3. Copies all line items from source invoices to the merged invoice
 * 4. Cancels all source invoices with proper audit trail
 * 
 * The workflow is atomic - if any step fails, all changes are rolled back through compensation functions.
 * 
 * @param invoice_ids - Array of invoice IDs to merge (2-10 invoices)
 * @param merged_by - User ID performing the merge
 * @param notes - Optional additional notes for the merged invoice
 * @param payment_terms - Optional payment terms override
 */
export const mergeInvoicesWorkflow = createWorkflow(
  mergeInvoicesWorkflowId,
  (input: MergeInvoicesInput) => {
    // Step 1: Validate that invoices can be merged
    const { invoices, customer_id, currency_code } = validateInvoicesMergeableStep({
      invoice_ids: input.invoice_ids,
    })

    // Step 2: Create new merged invoice
    const { merged_invoice } = createMergedInvoiceStep({
      invoices,
      customer_id,
      currency_code,
      merged_by: input.merged_by,
      notes: input.notes,
      payment_terms: input.payment_terms,
    })

    // Step 3: Copy all line items from source invoices to merged invoice
    const { line_items_created, total_amount } = copyLineItemsToMergedInvoiceStep({
      invoices,
      merged_invoice_id: merged_invoice.id,
    })

    // Step 4: Cancel source invoices with proper audit trail
    const { cancelled_count, cancelled_invoice_ids } = cancelSourceInvoicesStep({
      invoice_ids: input.invoice_ids,
      merged_invoice_id: merged_invoice.id,
      merged_invoice_number: merged_invoice.invoice_number,
      cancelled_by: input.merged_by,
    })

    // Return workflow result
    return new WorkflowResponse({
      merged_invoice: merged_invoice,
      cancelled_invoice_ids: cancelled_invoice_ids,
      line_items_count: line_items_created,
      total_amount: total_amount,
      source_invoice_count: cancelled_count,
    })
  }
)

