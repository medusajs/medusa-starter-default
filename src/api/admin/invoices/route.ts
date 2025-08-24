import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INVOICING_MODULE } from "../../../modules/invoicing"
import { createInvoiceFromOrderWorkflow } from "../../../workflows/invoicing/create-invoice-from-order"
import { createInvoiceFromServiceOrderWorkflow } from "../../../workflows/invoicing/create-invoice-from-service-order"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

interface CreateInvoiceRequest {
  source_type: "order" | "service_order"
  source_id: string
  invoice_type?: string
  due_date?: string | Date
  payment_terms?: string
  notes?: string
  [key: string]: any
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const invoicingService: any = req.scope.resolve(INVOICING_MODULE)
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    
    const { 
      status, 
      invoice_type,
      customer_id,
      q,
      limit = 50, 
      offset = 0,
      order = "created_at",
      direction = "DESC"
    } = req.query
    
    // Build filters
    const filters: any = {}
    if (status) filters.status = status
    if (invoice_type) filters.invoice_type = invoice_type
    if (customer_id) filters.customer_id = customer_id
    
    // Add search functionality
    if (q) {
      filters.$or = [
        { invoice_number: { $ilike: `%${q}%` } },
        { customer_email: { $ilike: `%${q}%` } },
        { notes: { $ilike: `%${q}%` } },
      ]
    }

    // Get invoices with related data using Remote Query
    const { data: invoices, metadata } = await query.graph({
      entity: "invoice",
      fields: [
        "id",
        "invoice_number",
        "status",
        "invoice_type",
        "invoice_date",
        "due_date",
        "total_amount",
        "currency_code",
        "customer_email",
        "created_at",
        "updated_at",
        "customer.*", // Get customer details
      ],
      filters,
      pagination: {
        skip: Number(offset),
        take: Number(limit),
        order: { [order as string]: direction },
      },
    })
    
    res.json({ 
      invoices,
      count: metadata?.count || invoices.length,
      offset: Number(offset),
      limit: Number(limit)
    })
  } catch (error) {
    console.error("Error fetching invoices:", error)
    res.status(500).json({ 
      error: "Failed to fetch invoices",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { 
      source_type, 
      source_id, 
      invoice_type,
      due_date,
      payment_terms,
      notes,
      ...rest 
    } = req.body as CreateInvoiceRequest
    
    // Validate required fields
    if (!source_type || !source_id) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "source_type and source_id are required" 
      })
    }
    
    if (!["order", "service_order"].includes(source_type)) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "source_type must be 'order' or 'service_order'" 
      })
    }

    let result
    const commonData = {
      invoice_type,
      due_date: due_date ? new Date(due_date) : undefined,
      payment_terms,
      notes,
      created_by: (req as any).user?.id || "system",
      ...rest
    }

    if (source_type === "order") {
      const { result: workflowResult } = await createInvoiceFromOrderWorkflow(req.scope).run({
        input: {
          order_id: source_id,
          ...commonData
        }
      })
      result = workflowResult
    } else if (source_type === "service_order") {
      const { result: workflowResult } = await createInvoiceFromServiceOrderWorkflow(req.scope).run({
        input: {
          service_order_id: source_id,
          ...commonData
        }
      })
      result = workflowResult
    }
    
    res.status(201).json({ invoice: result })
  } catch (error) {
    console.error("Error creating invoice:", error)
    res.status(500).json({ 
      error: "Failed to create invoice",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
} 