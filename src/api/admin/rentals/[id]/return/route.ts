import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RENTALS_MODULE, RentalsModuleService } from "../../../../../modules/rentals"

interface ReturnRentalRequest {
  actual_return_date?: string
  condition_on_return?: string
  damage_notes?: string
  additional_charges?: number
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const returnData = req.body as ReturnRentalRequest
    
    const rentalsService = req.scope.resolve(RENTALS_MODULE) as RentalsModuleService
    
    const returnedRental = await rentalsService.returnRental(
      id,
      {
        ...returnData,
        actual_return_date: returnData.actual_return_date ? new Date(returnData.actual_return_date) : new Date(),
        returned_by: req.auth?.actor_id
      }
    )
    
    res.json({
      rental: returnedRental
    })
  } catch (error) {
    console.error("Error returning rental:", error)
    
    if (error.type === "not_found") {
      return res.status(404).json({ 
        error: "Rental not found" 
      })
    }
    
    if (error.type === "not_allowed") {
      return res.status(400).json({ 
        error: "Rental cannot be returned",
        details: error.message
      })
    }
    
    res.status(500).json({ 
      error: "Failed to return rental",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}