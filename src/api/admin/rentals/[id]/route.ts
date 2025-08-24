import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RENTALS_MODULE, RentalsModuleService } from "../../../../modules/rentals"
import { MACHINES_MODULE } from "../../../../modules/machines"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { UpdateRentalOrderDTO } from "../../../../modules/rentals/types"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const machinesService = req.scope.resolve(MACHINES_MODULE)
    
    // Get rental order with related data
    const { data: rentals } = await query.graph({
      entity: "rental_order",
      fields: ["*"],
      filters: { id },
    })
    
    if (!rentals || rentals.length === 0) {
      return res.status(404).json({ 
        error: "Rental not found" 
      })
    }
    
    const rental = rentals[0]
    
    // Populate machine information
    let machineInfo = null
    if (rental.machine_id) {
      try {
        const machine = await machinesService.retrieveMachine(rental.machine_id)
        machineInfo = {
          id: machine.id,
          model_number: machine.model_number,
          serial_number: machine.serial_number,
          machine_type: machine.machine_type,
          brand_id: machine.brand_id
        }
      } catch (error) {
        console.warn(`Failed to fetch machine ${rental.machine_id}:`, error)
      }
    }
    
    res.json({
      rental: {
        ...rental,
        machine: machineInfo
      }
    })
  } catch (error) {
    console.error("Error fetching rental:", error)
    res.status(500).json({ 
      error: "Failed to fetch rental",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const updateData = req.body as UpdateRentalOrderDTO
    
    const rentalsService = req.scope.resolve(RENTALS_MODULE) as RentalsModuleService
    
    const updatedRental = await rentalsService.updateRentalOrders(
      { id },
      { ...updateData, updated_by: (req as any).user?.id },
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