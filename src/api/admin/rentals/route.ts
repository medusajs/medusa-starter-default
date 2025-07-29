import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RENTALS_MODULE, RentalsModuleService } from "../../../modules/rentals"
import { MACHINES_MODULE } from "../../../modules/machines"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createRentalOrderWorkflow } from "../../../modules/rentals/workflows"
import { CreateRentalOrderDTO, RentalOrderFilters } from "../../../modules/rentals/types"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const machinesService = req.scope.resolve(MACHINES_MODULE)
    
    const { 
      limit = 50, 
      offset = 0,
      q,
      status,
      customer_id,
      machine_id,
      rental_type,
      start_date_gte,
      start_date_lte,
      end_date_gte,
      end_date_lte,
      ...filters 
    } = req.query
    
    // Build filters
    const queryFilters: any = { ...filters }
    
    if (status) {
      queryFilters.status = Array.isArray(status) ? status : [status]
    }
    if (customer_id) queryFilters.customer_id = customer_id
    if (machine_id) queryFilters.machine_id = machine_id
    if (rental_type) queryFilters.rental_type = rental_type
    
    // Date range filters
    if (start_date_gte || start_date_lte) {
      queryFilters.start_date = {}
      if (start_date_gte) queryFilters.start_date.gte = new Date(start_date_gte as string)
      if (start_date_lte) queryFilters.start_date.lte = new Date(start_date_lte as string)
    }
    
    if (end_date_gte || end_date_lte) {
      queryFilters.end_date = {}
      if (end_date_gte) queryFilters.end_date.gte = new Date(end_date_gte as string)
      if (end_date_lte) queryFilters.end_date.lte = new Date(end_date_lte as string)
    }
    
    // Add search functionality
    if (q) {
      queryFilters.$or = [
        { rental_order_number: { $ilike: `%${q}%` } },
        { notes: { $ilike: `%${q}%` } },
        { internal_notes: { $ilike: `%${q}%` } },
        { special_instructions: { $ilike: `%${q}%` } },
      ]
    }

    // Use Query to get rental orders
    const { data: rentals } = await query.graph({
      entity: "rental_order",
      fields: ["*"],
      filters: queryFilters,
      pagination: {
        take: Number(limit),
        skip: Number(offset),
      },
    })
    
    // Get count using the rentals service
    const rentalsService = req.scope.resolve(RENTALS_MODULE) as RentalsModuleService
    const [, count] = await rentalsService.listAndCountRentalOrders(queryFilters, {
      take: Number(limit),
      skip: Number(offset),
    })

    // Populate machine information for each rental
    const rentalsWithMachines = await Promise.all(
      rentals.map(async (rental: any) => {
        if (rental.machine_id) {
          try {
            const machine = await machinesService.retrieveMachine(rental.machine_id)
            return {
              ...rental,
              machine_model: machine.model_number,
              machine_serial: machine.serial_number,
              machine_type: machine.machine_type
            }
          } catch (error) {
            console.warn(`Failed to fetch machine ${rental.machine_id}:`, error)
            return {
              ...rental,
              machine_model: null,
              machine_serial: null,
              machine_type: null
            }
          }
        }
        return {
          ...rental,
          machine_model: null,
          machine_serial: null,
          machine_type: null
        }
      })
    )
    
    res.json({
      rentals: rentalsWithMachines,
      count,
      offset: Number(offset),
      limit: Number(limit),
    })
  } catch (error) {
    console.error("Error fetching rentals:", error)
    res.status(500).json({ 
      error: "Failed to fetch rentals",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const rentalData = req.body as CreateRentalOrderDTO
    
    // Run the create rental order workflow
    const { result } = await createRentalOrderWorkflow(req.scope).run({
      input: {
        rental: rentalData
      }
    })
    
    res.status(201).json({
      rental: result.rental,
    })
  } catch (error) {
    console.error("Error creating rental:", error)
    
    // Handle specific error types
    if (error.type === "not_allowed") {
      return res.status(409).json({ 
        error: "Machine not available",
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
      error: "Failed to create rental",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}