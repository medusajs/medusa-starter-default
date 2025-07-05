import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TECHNICIANS_MODULE } from "../../../modules/technicians"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    console.log("Technicians API: Attempting to resolve technicians service...")
    const techniciansService = req.scope.resolve(TECHNICIANS_MODULE)
    console.log("Technicians API: Service resolved successfully")
    
    const { limit = 50, offset = 0, ...filters } = req.query
    console.log("Technicians API: Query params:", { limit, offset, filters })
    
    console.log("Technicians API: Calling listAndCountTechnicians...")
    const [data, count] = await techniciansService.listAndCountTechnicians(
      filters,
      {
        limit: Number(limit),
        offset: Number(offset),
      }
    )
    
    console.log("Technicians API: Successfully retrieved data:", { count, dataLength: data?.length })
    
    res.json({
      technicians: data,
      count,
      offset: Number(offset),
      limit: Number(limit),
    })
  } catch (error) {
    console.error("Technicians API Error:", error)
    console.error("Error stack:", error.stack)
    console.error("Error message:", error.message)
    res.status(500).json({ 
      error: "Failed to fetch technicians",
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const techniciansService = req.scope.resolve(TECHNICIANS_MODULE)
    
    const technician = await techniciansService.createTechnician(req.body)
    
    res.status(201).json({
      technician: technician
    })
  } catch (error) {
    console.error("Error creating technician:", error)
    res.status(500).json({ 
      error: "Failed to create technician",
      details: error.message 
    })
  }
} 