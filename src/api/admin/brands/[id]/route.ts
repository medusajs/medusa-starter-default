import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRANDS_MODULE } from "../../../../modules/brands"

interface UpdateBrandRequest {
  code?: string
  name?: string
  logo_url?: string | null
  website_url?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  description?: string | null
  is_oem?: boolean
  authorized_dealer?: boolean
  support_level?: string
  certification_level?: string
  metadata?: Record<string, unknown>
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const brandsService = req.scope.resolve(BRANDS_MODULE)
    
    const brand = await brandsService.retrieve(id)
    
    res.json({
      brand: brand
    })
  } catch (error) {
    console.error("Error fetching brand:", error)
    res.status(500).json({ 
      error: "Failed to fetch brand",
      details: error.message 
    })
  }
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const brandsService = req.scope.resolve(BRANDS_MODULE)
    
    const updateData = req.body as UpdateBrandRequest
    
    // If updating code, check uniqueness
    if (updateData.code) {
      const existingBrands = await brandsService.list({ 
        code: updateData.code,
        id: { $ne: id }
      })
      if (existingBrands.length > 0) {
        return res.status(400).json({
          error: "Brand code already exists",
          details: `Brand with code "${updateData.code}" already exists`
        })
      }
    }
    
    const brand = await brandsService.update(id, updateData)
    
    res.json({
      brand: brand
    })
  } catch (error) {
    console.error("Error updating brand:", error)
    res.status(500).json({ 
      error: "Failed to update brand",
      details: error.message 
    })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const brandsService = req.scope.resolve(BRANDS_MODULE)
    
    await brandsService.delete([id])
    
    res.status(204).send()
  } catch (error) {
    console.error("Error deleting brand:", error)
    res.status(500).json({ 
      error: "Failed to delete brand",
      details: error.message 
    })
  }
} 