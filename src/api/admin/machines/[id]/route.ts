import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MACHINES_MODULE } from "../../../../modules/machines"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const machinesService = req.scope.resolve(MACHINES_MODULE)
    
    const machine = await machinesService.retrieveMachine(id)
    
    res.json({
      machine: machine
    })
  } catch (error) {
    console.error("Error fetching machine:", error)
    res.status(500).json({ 
      error: "Failed to fetch machine",
      details: error.message 
    })
  }
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const machinesService = req.scope.resolve(MACHINES_MODULE)
    
    const machine = await machinesService.updateMachines(id, req.body)
    
    res.json({
      machine: machine
    })
  } catch (error) {
    console.error("Error updating machine:", error)
    res.status(500).json({ 
      error: "Failed to update machine",
      details: error.message 
    })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const machinesService = req.scope.resolve(MACHINES_MODULE)
    
    await machinesService.deleteMachines(id)
    
    res.status(204).send()
  } catch (error) {
    console.error("Error deleting machine:", error)
    res.status(500).json({ 
      error: "Failed to delete machine",
      details: error.message 
    })
  }
} 