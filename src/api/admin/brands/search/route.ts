import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRANDS_MODULE } from "../../../../modules/brands"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const brandsService = req.scope.resolve(BRANDS_MODULE)
    
    const { 
      q, // search query
      type, // "oem", "aftermarket", "all"
      authorized_only,
      active_only = true,
      limit = 20,
      offset = 0
    } = req.query
    
    let brands = []
    
    if (q) {
      // Text search
      brands = await brandsService.searchBrands(q as string, {
        limit: Number(limit),
        offset: Number(offset),
      })
    } else {
      // Filter-based search
      const filters: any = {}
      
      if (active_only === 'true') filters.is_active = true
      if (authorized_only === 'true') filters.authorized_dealer = true
      
      switch (type) {
        case 'oem':
          filters.is_oem = true
          break
        case 'aftermarket':
          filters.is_oem = false
          break
        // 'all' or undefined - no filter
      }
      
      brands = await brandsService.listBrandsOrdered(filters, {
        limit: Number(limit),
        offset: Number(offset),
      })
    }
    
    // Filter based on additional criteria if needed
    if (type && q) {
      brands = brands.filter(brand => {
        switch (type) {
          case 'oem':
            return brand.is_oem
          case 'aftermarket':
            return !brand.is_oem
          default:
            return true
        }
      })
    }
    
    if (authorized_only === 'true' && q) {
      brands = brands.filter(brand => brand.authorized_dealer)
    }
    
    res.json({
      brands,
      count: brands.length,
      query: q || '',
      filters: {
        type,
        authorized_only: authorized_only === 'true',
        active_only: active_only === 'true'
      }
    })
  } catch (error) {
    console.error("Error searching brands:", error)
    res.status(500).json({ 
      error: "Failed to search brands",
      details: error.message 
    })
  }
} 