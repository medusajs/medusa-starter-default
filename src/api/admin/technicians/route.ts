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
      take: Number(limit),
      skip: Number(offset),
    }
    
    // Add sorting
    if (order) {
      const orderStr = String(order)
      const isDesc = orderStr.startsWith('-')
      const field = isDesc ? orderStr.substring(1) : orderStr
      options.orderBy = { [field]: isDesc ? 'desc' : 'asc' }
    }
    
    console.log("Technicians API: Calling listAndCountTechnicians with filters:", filterObj)
    console.log("Technicians API: Options:", options)
    
    // Use the generated method from MedusaService
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
    
    // Validate required fields
    const { first_name, last_name, email, ...rest } = req.body as any
    
    if (!first_name || first_name.trim() === "") {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "First name is required" 
      })
    }
    
    if (!last_name || last_name.trim() === "") {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "Last name is required" 
      })
    }
    
    if (!email || email.trim() === "") {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "Email is required" 
      })
    }
    
    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: "Please enter a valid email address" 
      })
    }
    
    // Clean up the data by removing empty strings and converting them to null for optional fields
    const cleanedData = {
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: email.trim(),
      ...rest
    }
    
    // Convert empty strings to null for optional fields
    Object.keys(cleanedData).forEach(key => {
      if (typeof cleanedData[key] === 'string' && cleanedData[key].trim() === '' && 
          !['first_name', 'last_name', 'email', 'status'].includes(key)) {
        cleanedData[key] = null
      }
    })
    
    const technician = await techniciansService.createTechnicians(cleanedData)
    
    res.status(201).json({
      technician: technician
    })
  } catch (error) {
    console.error("Error creating technician:", error)
    
    // Handle specific error types
    if (error.message && error.message.includes('unique')) {
      if (error.message.includes('email')) {
        return res.status(400).json({ 
          error: "Email already exists",
          details: "A technician with this email address already exists"
        })
      }
      if (error.message.includes('employee_id')) {
        return res.status(400).json({ 
          error: "Employee ID already exists", 
          details: "A technician with this employee ID already exists"
        })
      }
    }
    
    if (error.type === 'invalid_data') {
      return res.status(400).json({ 
        error: "Invalid data",
        details: error.message
      })
    }
    
    res.status(500).json({ 
      error: "Failed to create technician",
      details: error.message 
    })
  }
} 