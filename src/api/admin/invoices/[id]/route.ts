import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INVOICING_MODULE } from "../../../../modules/invoicing"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateInvoiceWorkflow } from "../../../../workflows/invoicing/update-invoice-workflow"
import { changeInvoiceStatusWorkflow } from "../../../../workflows/invoicing/change-invoice-status-workflow"
import { deleteInvoiceWorkflow } from "../../../../workflows/invoicing/delete-invoice-workflow"

interface UpdateInvoiceRequest {
  status?: string
  status_reason?: string
  line_items?: any[]
  [key: string]: any
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const invoicingService: any = req.scope.resolve(INVOICING_MODULE)
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const invoiceId = req.params.id
    
    // Get invoice with full details using Remote Query with relationships
    const { data: [invoice] } = await query.graph({
      entity: "invoice",
      fields: [
        "*",
        "customer.*",
        "line_items.*",
        "status_history.*",
      ],
      filters: {
        id: invoiceId,
      },
    })
    
    if (!invoice) {
      return res.status(404).json({ 
        error: "Invoice not found",
        details: `Invoice with id ${invoiceId} does not exist`
      })
    }
    
    res.json({ invoice })
  } catch (error) {
    console.error("Error fetching invoice:", error)
    res.status(500).json({ 
      error: "Failed to fetch invoice",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  try {
    const invoiceId = req.params.id
    const { status, status_reason, ...updateData } = req.body as UpdateInvoiceRequest

    // Handle status changes via workflow (validates transitions)
    if (status) {
      await changeInvoiceStatusWorkflow(req.scope).run({
        input: {
          invoice_id: invoiceId,
          new_status: status,
          user_id: (req as any).user?.id || "system",
          reason: status_reason,
        }
      })

      // Return updated invoice with relationships
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
      const { data: [updatedInvoice] } = await query.graph({
        entity: "invoice",
        fields: [
          "*",
          "customer.*",
          "line_items.*",
          "status_history.*",
        ],
        filters: {
          id: invoiceId,
        },
      })

      return res.json({ invoice: updatedInvoice })
    }

    // Handle field updates via workflow (validates draft status)
    if (Object.keys(updateData).length > 0) {
      // Filter updateData to only include allowed properties from UpdateInvoiceInput
      const filteredData: {
        customer_email?: string
        customer_phone?: string
        payment_terms?: string
        notes?: string
        internal_notes?: string
        discount_amount?: number
      } = {}

      if ('customer_email' in updateData) filteredData.customer_email = updateData.customer_email
      if ('customer_phone' in updateData) filteredData.customer_phone = updateData.customer_phone
      if ('payment_terms' in updateData) filteredData.payment_terms = updateData.payment_terms
      if ('notes' in updateData) filteredData.notes = updateData.notes
      if ('internal_notes' in updateData) filteredData.internal_notes = updateData.internal_notes
      if ('discount_amount' in updateData) filteredData.discount_amount = updateData.discount_amount

      await updateInvoiceWorkflow(req.scope).run({
        input: {
          invoice_id: invoiceId,
          data: filteredData,
        }
      })

      // Return updated invoice with relationships
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
      const { data: [updatedInvoice] } = await query.graph({
        entity: "invoice",
        fields: [
          "*",
          "customer.*",
          "line_items.*",
          "status_history.*",
        ],
        filters: {
          id: invoiceId,
        },
      })

      return res.json({ invoice: updatedInvoice })
    }

    // No updates provided
    res.status(400).json({
      error: "No update data provided",
      details: "Request body must contain fields to update"
    })
  } catch (error: any) {
    console.error("Error updating invoice:", error)

    // Handle validation errors from workflow
    if (error.type === "not_found") {
      return res.status(404).json({
        error: error.message,
      })
    }

    if (error.type === "invalid_data") {
      return res.status(400).json({
        error: error.message,
      })
    }

    res.status(500).json({
      error: "Failed to update invoice",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const id = req.params.id

  try {
    // Use workflow for safe deletion with cascade
    const { result } = await deleteInvoiceWorkflow(req.scope).run({
      input: {
        invoice_id: id,
      }
    })

    res.json({
      success: true,
      message: `Invoice ${result.invoice_number} deleted successfully`
    })
  } catch (error: any) {
    console.error("Error deleting invoice:", error)

    // Handle specific error types
    if (error.message?.includes("Only draft invoices")) {
      return res.status(400).json({
        error: "Cannot delete invoice",
        details: "Only draft invoices can be deleted"
      })
    }

    if (error.type === "not_found" || error.message?.includes("not found")) {
      return res.status(404).json({
        error: "Invoice not found",
        details: `Invoice with id ${id} does not exist`
      })
    }

    res.status(500).json({
      error: "Failed to delete invoice",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
} 