import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRANDS_MODULE } from "../../../modules/brands"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const brandsService = req.scope.resolve(BRANDS_MODULE) as any
    
    const { 
      limit = 50, 
      offset = 0, 
      is_active,
      is_oem,
      authorized_dealer,
      search,
      order,
      q, // Alternative search parameter
      ...filters 
    } = req.query
    
    // Build filters
    const queryFilters: any = { ...filters }
    
    // Handle array values for filters (when multiple values are selected)
    if (is_active !== undefined) {
      if (Array.isArray(is_active)) {
        queryFilters.is_active = { $in: is_active.map(val => val === 'true') }
      } else {
        queryFilters.is_active = is_active === 'true'
      }
    }
    
    if (is_oem !== undefined) {
      if (Array.isArray(is_oem)) {
        queryFilters.is_oem = { $in: is_oem.map(val => val === 'true') }
      } else {
        queryFilters.is_oem = is_oem === 'true'
      }
    }
    
    if (authorized_dealer !== undefined) {
      if (Array.isArray(authorized_dealer)) {
        queryFilters.authorized_dealer = { $in: authorized_dealer.map(val => val === 'true') }
      } else {
        queryFilters.authorized_dealer = authorized_dealer === 'true'
      }
    }
    
    // Handle search - search in name and code
    const searchTerm = search || q
    if (searchTerm && typeof searchTerm === 'string') {
      queryFilters.$or = [
        { name: { $ilike: `%${searchTerm}%` } },
        { code: { $ilike: `%${searchTerm}%` } },
      ]
    }
    
    // Handle sorting
    let orderBy: any = { display_order: "ASC", name: "ASC" } // Default order
    
    if (order && typeof order === 'string') {
      const isDescending = order.startsWith('-')
      const field = isDescending ? order.substring(1) : order
      
      // Map frontend field names to database field names if needed
      const fieldMapping: { [key: string]: string } = {
        'code': 'code',
        'name': 'name',
        'country_of_origin': 'country_of_origin',
        'is_active': 'is_active',
      }
      
      const dbField = fieldMapping[field] || field
      orderBy = { [dbField]: isDescending ? "DESC" : "ASC" }
    }
    
    // Use the generated method from MedusaService
    const [brands, count] = await brandsService.listAndCountBrands(
      queryFilters,
      {
        take: Number(limit),
        skip: Number(offset),
        order: orderBy
      }
    )
    
    res.json({
      brands,
      count,
      offset: Number(offset),
      limit: Number(limit),
    })
  } catch (error) {
    console.error("Error fetching brands:", error)
    res.status(500).json({ 
      error: "Failed to fetch brands",
      details: error.message 
    })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const brandsService = req.scope.resolve(BRANDS_MODULE) as any
    
    // Validate required fields
    const { name, code } = req.body as any
    if (!name || !code) {
      return res.status(400).json({
        error: "Missing required fields",
        details: "Name and code are required"
      })
    }
    
    // Check if brand code is unique
    const existingBrands = await brandsService.listBrands({ code })
    if (existingBrands.length > 0) {
      return res.status(400).json({
        error: "Brand code already exists",
        details: `Brand with code "${code}" already exists`
      })
    }
    
    // Use the generated method from MedusaService
    const brand = await brandsService.createBrands(req.body)
    
    res.status(201).json({
      brand
    })
  } catch (error) {
    console.error("Error creating brand:", error)
    res.status(500).json({ 
      error: "Failed to create brand",
      details: error.message 
    })
  }
} 