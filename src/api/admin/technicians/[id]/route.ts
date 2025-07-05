import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TECHNICIANS_MODULE } from "../../../../modules/technicians"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const techniciansService = req.scope.resolve(TECHNICIANS_MODULE)
    
    const technician = await techniciansService.retrieveTechnician(id)
    
    res.json({
      technician: technician
    })
  } catch (error) {
    console.error("Error fetching technician:", error)
    res.status(500).json({ 
      error: "Failed to fetch technician",
      details: error.message 
    })
  }
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const techniciansService = req.scope.resolve(TECHNICIANS_MODULE)
    
    const technician = await techniciansService.updateTechnicians(id, req.body)
    
    res.json({
      technician: technician
    })
  } catch (error) {
    console.error("Error updating technician:", error)
    res.status(500).json({ 
      error: "Failed to update technician",
      details: error.message 
    })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const techniciansService = req.scope.resolve(TECHNICIANS_MODULE)
    
    await techniciansService.deleteTechnicians(id)
    
    res.status(204).send()
  } catch (error) {
    console.error("Error deleting technician:", error)
    res.status(500).json({ 
      error: "Failed to delete technician",
      details: error.message 
    })
  }
} 