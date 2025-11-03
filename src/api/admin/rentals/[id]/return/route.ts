import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RENTALS_MODULE, RentalsModuleService } from "../../../../../modules/rentals"
import { ReturnRentalSchemaType } from "../../validators"

/**
 * TEM-204: Return a rental order
 * POST /admin/rentals/:id/return
 *
 * Validates request body using ReturnRentalSchema (Zod)
 * Marks rental as returned with condition and damage tracking
 */
export async function POST(
  req: MedusaRequest<ReturnRentalSchemaType>,
  res: MedusaResponse
) {
  try {
    const { id } = req.params
    // TEM-204: Access validated body from middleware
    const returnData = req.validatedBody

    const rentalsService = req.scope.resolve(RENTALS_MODULE) as RentalsModuleService

    const returnedRental = await rentalsService.returnRental(
      id,
      {
        ...returnData,
        actual_return_date: returnData.actual_return_date
          ? new Date(returnData.actual_return_date)
          : new Date(),
        returned_by: (req as any).user?.id
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