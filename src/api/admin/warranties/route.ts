import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { WARRANTIES_MODULE } from "../../../modules/warranties"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const warrantiesService: any = req.scope.resolve(WARRANTIES_MODULE)
    
    const { 
      status, 
      warranty_type,
      customer_id,
      machine_id,
      service_order_id,
      q,
      limit = 50, 
      offset = 0,
      order = "created_at",
      direction = "DESC"
    } = req.query
    
    console.log("Warranties API called with params:", req.query)
    console.log("Warranties service resolved:", !!warrantiesService)
    
    // Build filters
    const filters: any = {}
    if (status) filters.status = status
    if (warranty_type) filters.warranty_type = warranty_type
    if (customer_id) filters.customer_id = customer_id
    if (machine_id) filters.machine_id = machine_id
    if (service_order_id) filters.service_order_id = service_order_id
    
    // Add search functionality
    if (q) {
      filters.$or = [
        { warranty_number: { $ilike: `%${q}%` } },
        { warranty_claim_number: { $ilike: `%${q}%` } },
        { warranty_provider: { $ilike: `%${q}%` } },
        { claim_reference: { $ilike: `%${q}%` } },
        { description: { $ilike: `%${q}%` } },
        { failure_description: { $ilike: `%${q}%` } },
        { repair_description: { $ilike: `%${q}%` } },
        { notes: { $ilike: `%${q}%` } },
      ]
    }

    console.log("Using filters:", filters)

    // Try using the service directly first to debug
    try {
      const warranties = await warrantiesService.listWarranties(filters)
      console.log("Direct service call successful, warranties count:", warranties.length)
      
      res.json({ 
        warranties,
        count: warranties.length,
        offset: Number(offset),
        limit: Number(limit)
      })
    } catch (serviceError) {
      console.error("Direct service call failed:", serviceError)
      
      // Try without filters to see if that works
      try {
        console.log("Trying listWarranties without filters...")
        const allWarranties = await warrantiesService.listWarranties({})
        console.log("No-filter call successful, warranties count:", allWarranties.length)
        
        res.json({ 
          warranties: allWarranties,
          count: allWarranties.length,
          offset: Number(offset),
          limit: Number(limit)
        })
      } catch (noFilterError) {
        console.error("No-filter call also failed:", noFilterError)
        console.error("Available methods on warrantiesService:", Object.getOwnPropertyNames(warrantiesService))
        
        // Return empty response as fallback
        res.json({ 
          warranties: [],
          count: 0,
          offset: Number(offset),
          limit: Number(limit)
        })
      }
    }
  } catch (error) {
    console.error("Error fetching warranties:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack")
    res.status(500).json({ 
      error: "Failed to fetch warranties",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const warrantiesService: any = req.scope.resolve(WARRANTIES_MODULE)
    const { 
      service_order_id,
      warranty_type = "manufacturer",
      warranty_claim_number,
      warranty_provider,
      claim_reference,
      labor_cost = 0,
      parts_cost = 0,
      total_cost = 0,
      reimbursement_amount = 0,
      currency_code = "EUR",
      warranty_start_date,
      warranty_end_date,
      claim_date,
      approval_date,
      reimbursement_date,
      description,
      failure_description,
      repair_description,
      notes,
      internal_notes,
      customer_id,
      machine_id,
      ...rest 
    } = req.body as any
    
    // Validate required fields
    if (!service_order_id) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "service_order_id is required" 
      })
    }
    
    // Create warranty with auto-generated warranty number
    const warranty = await warrantiesService.createWarrantyWithNumber({
      service_order_id,
      warranty_type,
      warranty_claim_number,
      warranty_provider,
      claim_reference,
      labor_cost,
      parts_cost,
      total_cost,
      reimbursement_amount,
      currency_code,
      warranty_start_date,
      warranty_end_date,
      claim_date,
      approval_date,
      reimbursement_date,
      description,
      failure_description,
      repair_description,
      notes,
      internal_notes,
      customer_id,
      machine_id,
      ...rest
    })
    
    res.status(201).json(warranty)
  } catch (error) {
    console.error("Error creating warranty:", error)
    res.status(500).json({ 
      error: "Failed to create warranty",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
} 