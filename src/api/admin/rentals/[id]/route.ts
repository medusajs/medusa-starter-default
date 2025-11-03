import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RENTALS_MODULE, RentalsModuleService } from "../../../../modules/rentals"
import { MACHINES_MODULE } from "../../../../modules/machines"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { UpdateRentalOrderDTO } from "../../../../modules/rentals/types"
import { UpdateRentalSchemaType } from "../validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    // TEM-203: Get rental with linked customer and machine data using Query API
    // This uses the module links defined in:
    // - src/links/rental-customer.ts (read-only link to customer)
    // - src/links/rental-machine.ts (bidirectional link to machine)
    // TEM-209: Include status_history for status timeline display
    const { data: rentals } = await query.graph({
      entity: "rental",
      fields: [
        "*",
        "customer.*",  // Fetch linked customer data via module link
        "machine.*",   // Fetch linked machine data via module link
        "status_history.*" // TEM-209: Fetch status history for timeline
      ],
      filters: { id },
    })

    if (!rentals || rentals.length === 0) {
      return res.status(404).json({
        error: "Rental not found"
      })
    }

    res.json({
      rental: rentals[0]
    })
  } catch (error) {
    console.error("Error fetching rental:", error)
    res.status(500).json({
      error: "Failed to fetch rental",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

/**
 * TEM-204: Update existing rental order
 * PUT /admin/rentals/:id
 *
 * Validates request body using UpdateRentalSchema (Zod)
 * Updates rental order with partial data
 */
export async function PUT(
  req: MedusaRequest<UpdateRentalSchemaType>,
  res: MedusaResponse
) {
  try {
    const { id } = req.params
    // TEM-204: Access validated body from middleware
    const updateData = req.validatedBody

    const rentalsService = req.scope.resolve(RENTALS_MODULE) as RentalsModuleService

    // Convert ISO date strings to Date objects if provided
    const updateInput: Partial<UpdateRentalOrderDTO> = {
      ...updateData,
      ...(updateData.start_date && { start_date: new Date(updateData.start_date) }),
      ...(updateData.end_date && { end_date: new Date(updateData.end_date) }),
      updated_by: (req as any).user?.id,
    }

    const updatedRental = await rentalsService.updateRentalOrders(
      { id },
      updateInput,
    )

    res.json({
      rental: Array.isArray(updatedRental) ? updatedRental[0] : updatedRental
    })
  } catch (error) {
    console.error("Error updating rental:", error)

    if (error.type === "not_found") {
      return res.status(404).json({
        error: "Rental not found",
        details: error.message
      })
    }

    if (error.type === "invalid_data") {
      return res.status(400).json({
        error: "Invalid data",
        details: error.message
      })
    }

    res.status(500).json({
      error: "Failed to update rental",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const rentalsService = req.scope.resolve(RENTALS_MODULE) as RentalsModuleService
    
    await rentalsService.deleteRentalOrders([id])
    
    res.status(204).send()
  } catch (error) {
    console.error("Error deleting rental:", error)
    
    if (error.type === "not_found") {
      return res.status(404).json({ 
        error: "Rental not found" 
      })
    }
    
    res.status(500).json({ 
      error: "Failed to delete rental",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}