import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { INVOICING_MODULE } from "../../../../modules/invoicing"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

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
    const invoicingService: any = req.scope.resolve(INVOICING_MODULE)
    const invoiceId = req.params.id
    const updateData = req.body as any
    
    // Handle status changes separately to maintain history
    if (updateData.status) {
      const invoice = await invoicingService.changeInvoiceStatus(
        invoiceId,
        updateData.status,
        (req as any).auth_context?.actor_id || "system",
        updateData.status_reason
      )
      
      // Remove status from updateData to avoid duplicate update
      delete updateData.status
      delete updateData.status_reason
    }
    
    // Update other fields if present
    if (Object.keys(updateData).length > 0) {
      await invoicingService.updateInvoices(invoiceId, updateData)
    }
    
    // Recalculate totals if line items were affected
    if (updateData.line_items) {
      await invoicingService.recalculateInvoiceTotals(invoiceId)
    }
    
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
    
    res.json({ invoice: updatedInvoice })
  } catch (error) {
    console.error("Error updating invoice:", error)
    res.status(500).json({ 
      error: "Failed to update invoice",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const invoicingService: any = req.scope.resolve(INVOICING_MODULE)
    const invoiceId = req.params.id
    
    // Check if invoice exists and can be deleted
    const invoice = await invoicingService.retrieveInvoice(invoiceId)
    
    if (!invoice) {
      return res.status(404).json({ 
        error: "Invoice not found",
        details: `Invoice with id ${invoiceId} does not exist`
      })
    }
    
    // Only allow deletion of draft invoices
    if (invoice.status !== "draft") {
      return res.status(400).json({ 
        error: "Cannot delete invoice",
        details: "Only draft invoices can be deleted"
      })
    }
    
    await invoicingService.deleteInvoices([invoiceId])
    
    res.json({ 
      success: true,
      message: `Invoice ${invoice.invoice_number} deleted successfully`
    })
  } catch (error) {
    console.error("Error deleting invoice:", error)
    res.status(500).json({ 
      error: "Failed to delete invoice",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
} 