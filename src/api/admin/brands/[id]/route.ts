import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRANDS_MODULE } from "../../../../modules/brands"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const brandsService = req.scope.resolve(BRANDS_MODULE)
    
    const brand = await brandsService.retrieveBrand(id)
    
    res.json({
      brand
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
    
    // If updating code, check uniqueness
    if (req.body.code) {
      const isUnique = await brandsService.isBrandCodeUnique(req.body.code, id)
      if (!isUnique) {
        return res.status(400).json({
          error: "Brand code already exists",
          details: `Brand with code "${req.body.code}" already exists`
        })
      }
    }
    
    const brand = await brandsService.updateBrand(id, req.body)
    
    res.json({
      brand
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
    
    await brandsService.deleteBrand(id)
    
    res.status(204).send()
  } catch (error) {
    console.error("Error deleting brand:", error)
    res.status(500).json({ 
      error: "Failed to delete brand",
      details: error.message 
    })
  }
} 