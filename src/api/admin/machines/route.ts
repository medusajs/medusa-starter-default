import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MACHINES_MODULE } from "../../../modules/machines"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const machinesService = req.scope.resolve(MACHINES_MODULE)
    
    const { limit = 50, offset = 0, ...filters } = req.query
    
    const [data, count] = await machinesService.listAndCountMachines(
      filters,
      {
        limit: Number(limit),
        offset: Number(offset),
      }
    )
    
    res.json({
      machines: data,
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
    
    const machine = await machinesService.createMachines(req.body)
    
    res.status(201).json({
      machine: machine
    })
  } catch (error) {
    console.error("Error creating machine:", error)
    res.status(500).json({ 
      error: "Failed to create machine",
      details: error.message 
    })
  }
} 