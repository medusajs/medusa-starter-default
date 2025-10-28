import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { mergeInvoicesWorkflow } from "../../../../workflows/invoicing/merge-invoices-workflow"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * Request body for merging invoices
 */
interface MergeInvoicesRequest {
  invoice_ids: string[]
  notes?: string
  payment_terms?: string
}

/**
 * POST /admin/invoices/merge
 * 
 * Merges multiple invoices from the same customer into a single consolidated invoice.
 * 
 * Business Rules:
 * - Minimum 2 invoices required
 * - Maximum 10 invoices per merge
 * - All invoices must belong to the same customer
 * - All invoices must be in "draft" status
 * - All invoices must have the same currency
 * - No invoices can have associated payments
 * 
 * Process:
 * 1. Validates all invoices can be merged
 * 2. Creates a new merged invoice with combined line items
 * 3. Cancels all source invoices with audit trail
 * 4. Returns the merged invoice and details
 * 
 * The operation is atomic - if any step fails, all changes are rolled back.
 */
export async function POST(
  req: MedusaRequest<MergeInvoicesRequest>,
  res: MedusaResponse
) {
  try {
    const { invoice_ids, notes, payment_terms } = req.body

    // Validate request body
    if (!invoice_ids || !Array.isArray(invoice_ids)) {
      return res.status(400).json({
        error: "Validation failed",
        details: "invoice_ids must be an array of invoice IDs",
      })
    }

    if (invoice_ids.length < 2) {
      return res.status(400).json({
        error: "Validation failed",
        details: "At least 2 invoices are required to merge",
      })
    }

    if (invoice_ids.length > 10) {
      return res.status(400).json({
        error: "Validation failed",
        details: "Cannot merge more than 10 invoices at once",
      })
    }

    // Get user ID from authenticated request
    const userId = (req as any).auth_context?.actor_id || (req as any).user?.id || "system"

    // Execute merge workflow
    const { result } = await mergeInvoicesWorkflow(req.scope).run({
      input: {
        invoice_ids,
        merged_by: userId,
        notes,
        payment_terms,
      },
    })

    // Fetch complete merged invoice details with relationships using Remote Query
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    
    const { data: [mergedInvoiceDetails] } = await query.graph({
      entity: "invoice",
      fields: [
        "*",
        "customer.*",
        "line_items.*",
        "status_history.*",
      ],
      filters: {
        id: result.merged_invoice.id,
      },
    })

    // Fetch cancelled invoices with their details
    const { data: cancelledInvoices } = await query.graph({
      entity: "invoice",
      fields: [
        "id",
        "invoice_number",
        "status",
        "total_amount",
        "currency_code",
        "metadata",
      ],
      filters: {
        id: result.cancelled_invoice_ids,
      },
    })

    // Return success response
    return res.status(200).json({
      merged_invoice: mergedInvoiceDetails,
      cancelled_invoices: cancelledInvoices,
      summary: {
        source_invoice_count: result.source_invoice_count,
        line_items_count: result.line_items_count,
        total_amount: result.total_amount,
        currency_code: mergedInvoiceDetails.currency_code,
      },
      message: `Successfully merged ${result.source_invoice_count} invoices into ${mergedInvoiceDetails.invoice_number}`,
    })

  } catch (error: any) {
    console.error("Error merging invoices:", error)

    // Handle specific error types
    if (error.type === "not_found") {
      return res.status(404).json({
        error: "Not found",
        details: error.message,
      })
    }

    if (error.type === "invalid_data") {
      return res.status(409).json({
        error: "Merge not allowed",
        details: error.message,
      })
    }

    // Generic server error
    return res.status(500).json({
      error: "Failed to merge invoices",
      details: error.message || "An unexpected error occurred",
    })
  }
}

