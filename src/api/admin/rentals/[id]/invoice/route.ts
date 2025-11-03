import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createInvoiceFromRentalWorkflow } from "../../../../../workflows/invoicing/create-invoice-from-rental"

/**
 * TEM-206: Create Invoice from Rental Endpoint
 * POST /admin/rentals/:id/invoice
 *
 * Generates an invoice from a completed rental order using the
 * createInvoiceFromRentalWorkflow. Includes rental hours and costs.
 */

interface CreateInvoiceFromRentalRequest {
  invoice_type?: "service_work" | "mixed"
  due_date?: string | Date
  payment_terms?: string
  notes?: string
}

export async function POST(
  req: MedusaRequest<CreateInvoiceFromRentalRequest>,
  res: MedusaResponse
) {
  try {
    const { id } = req.params
    const {
      invoice_type,
      due_date,
      payment_terms,
      notes,
    } = req.body

    // TEM-206: Execute invoice generation workflow
    const { result: invoice } = await createInvoiceFromRentalWorkflow(req.scope).run({
      input: {
        rental_id: id,
        invoice_type,
        due_date: due_date ? new Date(due_date) : undefined,
        payment_terms,
        notes,
        created_by: (req as any).user?.id || "system",
      }
    })

    res.status(201).json({
      invoice
    })
  } catch (error) {
    console.error("Error creating invoice from rental:", error)

    // TEM-206: Handle common error cases
    if (error.message?.includes("not found")) {
      return res.status(404).json({
        error: "Rental not found",
        details: error instanceof Error ? error.message : "Unknown error"
      })
    }

    res.status(500).json({
      error: "Failed to create invoice from rental",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}
