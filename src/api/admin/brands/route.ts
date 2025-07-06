import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRANDS_MODULE } from "../../../modules/brands"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const brandsService = req.scope.resolve(BRANDS_MODULE)
    
    const { 
      limit = 50, 
      offset = 0, 
      is_active,
      is_oem,
      authorized_dealer,
      search,
      ...filters 
    } = req.query
    
    // Build filters
    const queryFilters: any = { ...filters }
    if (is_active !== undefined) queryFilters.is_active = is_active === 'true'
    if (is_oem !== undefined) queryFilters.is_oem = is_oem === 'true'
    if (authorized_dealer !== undefined) queryFilters.authorized_dealer = authorized_dealer === 'true'
    
    let brands, count
    
    if (search) {
      // Use search functionality
      brands = await brandsService.searchBrands(search as string, {
        limit: Number(limit),
        offset: Number(offset),
      })
      count = brands.length
    } else {
      // Regular list with count
      [brands, count] = await brandsService.listAndCountBrands(
        queryFilters,
        {
          limit: Number(limit),
          offset: Number(offset),
          order: { display_order: "ASC", name: "ASC" }
        }
      )
    }
    
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
    const brandsService = req.scope.resolve(BRANDS_MODULE)
    
    // Validate required fields
    const { name, code } = req.body
    if (!name || !code) {
      return res.status(400).json({
        error: "Missing required fields",
        details: "Name and code are required"
      })
    }
    
    // Check if brand code is unique
    const isUnique = await brandsService.isBrandCodeUnique(code)
    if (!isUnique) {
      return res.status(400).json({
        error: "Brand code already exists",
        details: `Brand with code "${code}" already exists`
      })
    }
    
    const brand = await brandsService.createBrand(req.body)
    
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