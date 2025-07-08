import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MACHINES_MODULE, MachinesModuleService } from "../../../modules/machines"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    
    const { 
      limit = 50, 
      offset = 0,
      q,
      status,
      customer_id,
      location,
      ...filters 
    } = req.query
    
    // Build filters
    const queryFilters: any = { ...filters }
    
    if (status) queryFilters.status = status
    if (customer_id) queryFilters.customer_id = customer_id
    if (location) queryFilters.location = { $ilike: `%${location}%` }
    
    // Add search functionality
    if (q) {
      queryFilters.$or = [
        { name: { $ilike: `%${q}%` } },
        { model_number: { $ilike: `%${q}%` } },
        { serial_number: { $ilike: `%${q}%` } },
        { description: { $ilike: `%${q}%` } },
        { notes: { $ilike: `%${q}%` } },
      ]
    }

    // Use Query to get machines with basic data for now
    // TODO: Add relationships once module links are properly configured
    const { data: machines } = await query.graph({
      entity: "machine",
      fields: ["*"],
      filters: queryFilters,
      pagination: {
        take: Number(limit),
        skip: Number(offset),
      },
    })
    
    // Get count using the machines service
    const machinesService = req.scope.resolve(MACHINES_MODULE) as MachinesModuleService
    const [, count] = await machinesService.listAndCountMachines(queryFilters, {
      take: Number(limit),
      skip: Number(offset),
    })
    
    res.json({
      machines,
      count,
      offset: Number(offset),
      limit: Number(limit),
    })
  } catch (error) {
    console.error("Error fetching machines:", error)
    res.status(500).json({ 
      error: "Failed to fetch machines",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const machinesService = req.scope.resolve(MACHINES_MODULE) as MachinesModuleService
    
    const body = req.body as any
    const { brand_id, customer_id, ...machineData } = body
    
    // Validate required fields
    if (!machineData.name || !machineData.model_number || !machineData.serial_number) {
      return res.status(400).json({
        error: "Missing required fields",
        details: "name, model_number, and serial_number are required"
      })
    }
    
    // Create the machine
    const [machine] = await machinesService.createMachines([{
      ...machineData,
      customer_id, // Store for backward compatibility
    }])
    
    // TODO: Add module link creation once links are properly configured
    // For now, we'll store the relationships in the traditional way
    
    res.status(201).json({
      machine,
    })
  } catch (error) {
    console.error("Error creating machine:", error)
    res.status(500).json({ 
      error: "Failed to create machine",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
} 