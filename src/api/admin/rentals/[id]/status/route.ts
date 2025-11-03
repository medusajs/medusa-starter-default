import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RENTALS_MODULE, RentalsModuleService } from "../../../../../modules/rentals"
import { RentalOrderStatus } from "../../../../../modules/rentals/types"
import { UpdateStatusSchemaType } from "../../validators"

/**
 * TEM-204: Update rental order status
 * PUT /admin/rentals/:id/status
 *
 * Validates request body using UpdateStatusSchema (Zod)
 * Updates status with automatic history tracking
 */
export async function PUT(
  req: MedusaRequest<UpdateStatusSchemaType>,
  res: MedusaResponse
) {
  try {
    const { id } = req.params
    // TEM-204: Access validated body from middleware
    const { status, reason } = req.validatedBody

    const rentalsService = req.scope.resolve(RENTALS_MODULE) as RentalsModuleService

    const updatedRental = await rentalsService.updateRentalOrderStatus(
      id,
      status as keyof typeof RentalOrderStatus,
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