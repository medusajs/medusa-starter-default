import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MACHINES_MODULE } from "../../../../modules/machines"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const query = req.scope.resolve("query")
    
    // Use query.graph to get machine with its brand relationship
    const { data: machines } = await query.graph({
      entity: "machine",
      fields: ["*", "brand.*"],
      filters: { id },
    })
    
    if (!machines || machines.length === 0) {
      return res.status(404).json({
        error: "Machine not found"
      })
    }
    
    res.json({
      machine: machines[0]
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
    const linkService = req.scope.resolve("linkService")
    
    const { brand_id, ...machineData } = req.body
    
    // Update the machine data
    const machine = await machinesService.updateMachine(id, machineData)
    
    // If brand_id is provided, update the machine-brand link
    if (brand_id) {
      // First, remove existing brand links for this machine
      await linkService.dismiss({
        [MACHINES_MODULE]: {
          machine_id: id,
        },
        brands: "*", // Remove all brand links for this machine
      })
      
      // Create new brand link
      await linkService.create({
        [MACHINES_MODULE]: {
          machine_id: id,
        },
        brands: {
          brand_id: brand_id,
        },
      })
    }
    
    res.json({
      machine
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
    const linkService = req.scope.resolve("linkService")
    
    // Remove machine-brand links first
    await linkService.dismiss({
      [MACHINES_MODULE]: {
        machine_id: id,
      },
      brands: "*", // Remove all brand links for this machine
    })
    
    // Delete the machine
    await machinesService.deleteMachine(id)
    
    res.status(204).send()
  } catch (error) {
    console.error("Error deleting machine:", error)
    res.status(500).json({ 
      error: "Failed to delete machine",
      details: error.message 
    })
  }
} 