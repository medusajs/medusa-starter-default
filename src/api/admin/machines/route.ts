import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MACHINES_MODULE } from "../../../modules/machines"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    console.log("Machines API: Attempting to resolve machines service...")
    const machinesService = req.scope.resolve(MACHINES_MODULE)
    console.log("Machines API: Service resolved successfully")
    
    const { limit = 50, offset = 0, ...filters } = req.query
    console.log("Machines API: Query params:", { limit, offset, filters })
    
    console.log("Machines API: Calling listAndCountMachines...")
    const [data, count] = await machinesService.listAndCountMachines(
      filters,
      {
        limit: Number(limit),
        offset: Number(offset),
      }
    )
    
    console.log("Machines API: Successfully retrieved data:", { count, dataLength: data?.length })
    
    res.json({
      machines: data,
      count,
      offset: Number(offset),
      limit: Number(limit),
    })
  } catch (error) {
    console.error("Machines API Error:", error)
    console.error("Error stack:", error.stack)
    console.error("Error message:", error.message)
    res.status(500).json({ 
      error: "Failed to fetch machines",
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const machinesService = req.scope.resolve(MACHINES_MODULE)
    
    const machine = await machinesService.createMachine(req.body)
    
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