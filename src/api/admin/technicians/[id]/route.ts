import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TECHNICIANS_MODULE } from "../../../../modules/technicians"

interface UpdateTechnicianRequest {
  name?: string
  email?: string
  phone?: string
  address?: string
  date_of_birth?: Date
  hire_date?: Date
  status?: string
  hourly_rate?: number
  specialties?: string[]
  certifications?: string[]
  emergency_contact_name?: string
  emergency_contact_phone?: string
  metadata?: Record<string, unknown>
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const techniciansService = req.scope.resolve(TECHNICIANS_MODULE)
    
    const technician = await techniciansService.retrieve(id)
    
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
    
    const updateData = req.body as UpdateTechnicianRequest
    const technician = await techniciansService.update(id, updateData)
    
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
    
    await techniciansService.delete([id])
    
    res.status(204).send()
  } catch (error) {
    console.error("Error deleting technician:", error)
    res.status(500).json({ 
      error: "Failed to delete technician",
      details: error.message 
    })
  }
} 