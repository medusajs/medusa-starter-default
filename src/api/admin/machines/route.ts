import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MACHINES_MODULE } from "../../../modules/machines"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const machinesService = req.scope.resolve(MACHINES_MODULE)
    const query = req.scope.resolve("query")
    
    const { 
      limit = 50, 
      offset = 0,
      ...filters 
    } = req.query
    
    // Use query.graph to get machines with their brand relationships
    const { data: machines, metadata } = await query.graph({
      entity: "machine",
      fields: ["*", "brand.*"],
      filters,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
      },
    })
    
    // Get count using the generated method
    const [, count] = await machinesService.listAndCountMachines(filters, {
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
      details: error.message 
    })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const machinesService = req.scope.resolve(MACHINES_MODULE)
    const linkService = req.scope.resolve("linkService")
    
    const { brand_id, ...machineData } = req.body
    
    // Validate required fields
    if (!brand_id) {
      return res.status(400).json({
        error: "Missing required field",
        details: "brand_id is required"
      })
    }
    
    // Create the machine using the generated method
    const machine = await machinesService.createMachines(machineData)
    
    // Create the machine-brand link
    if (brand_id) {
      await linkService.create({
        [MACHINES_MODULE]: {
          machine_id: machine.id,
        },
        brands: {
          brand_id: brand_id,
        },
      })
    }
    
    res.status(201).json({
      machine
    })
  } catch (error) {
    console.error("Error creating machine:", error)
    res.status(500).json({ 
      error: "Failed to create machine",
      details: error.message 
    })
  }
} 