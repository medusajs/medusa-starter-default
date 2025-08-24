import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RENTALS_MODULE, RentalsModuleService } from "../../../../../modules/rentals"
import { RentalOrderStatus } from "../../../../../modules/rentals/types"

interface UpdateStatusRequest {
  status: keyof typeof RentalOrderStatus
  reason?: string
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const { status, reason } = req.body as UpdateStatusRequest
    
    const rentalsService = req.scope.resolve(RENTALS_MODULE) as RentalsModuleService
    
    const updatedRental = await rentalsService.updateRentalOrderStatus(
      id,
      status,
      reason,
      (req as any).user?.id
    )
    
    res.json({
      rental: updatedRental
    })
  } catch (error) {
    console.error("Error updating rental status:", error)
    
    if (error.type === "not_found") {
      return res.status(404).json({ 
        error: "Rental not found" 
      })
    }
    
    if (error.type === "invalid_data") {
      return res.status(400).json({ 
        error: "Invalid status",
        details: error.message
      })
    }
    
    res.status(500).json({ 
      error: "Failed to update rental status",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}