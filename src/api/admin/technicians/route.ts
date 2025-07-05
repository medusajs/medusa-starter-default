import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TECHNICIANS_MODULE } from "../../../modules/technicians"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    console.log("Technicians API: Attempting to resolve technicians service...")
    const techniciansService = req.scope.resolve(TECHNICIANS_MODULE)
    console.log("Technicians API: Service resolved successfully")
    
    const { 
      limit = 50, 
      offset = 0, 
      q,
      status,
      department,
      order,
      ...filters 
    } = req.query
    
    console.log("Technicians API: Query params:", { 
      limit, 
      offset, 
      q, 
      status, 
      department, 
      order, 
      filters 
    })
    
    // Build filter object
    const filterObj: any = { ...filters }
    
    // Add search functionality
    if (q) {
      filterObj.$or = [
        { first_name: { $ilike: `%${q}%` } },
        { last_name: { $ilike: `%${q}%` } },
        { email: { $ilike: `%${q}%` } },
        { employee_id: { $ilike: `%${q}%` } },
        { department: { $ilike: `%${q}%` } },
        { position: { $ilike: `%${q}%` } },
      ]
    }
    
    // Add status filter
    if (status) {
      const statusArray = Array.isArray(status) ? status : [status]
      filterObj.status = { $in: statusArray }
    }
    
    // Add department filter
    if (department) {
      const departmentArray = Array.isArray(department) ? department : [department]
      filterObj.department = { $in: departmentArray }
    }
    
    // Build options object
    const options: any = {
      limit: Number(limit),
      offset: Number(offset),
    }
    
    // Add sorting
    if (order) {
      const isDesc = order.startsWith('-')
      const field = isDesc ? order.substring(1) : order
      options.orderBy = { [field]: isDesc ? 'desc' : 'asc' }
    }
    
    console.log("Technicians API: Calling listAndCountTechnicians with filters:", filterObj)
    console.log("Technicians API: Options:", options)
    
    const [data, count] = await techniciansService.listAndCountTechnicians(
      filterObj,
      options
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
    
    const technician = await techniciansService.createTechnicians(req.body)
    
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