import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STOCK_LOCATION_DETAILS_MODULE } from "../../../../../modules/stock-location-details"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const stockLocationDetailsService = req.scope.resolve(STOCK_LOCATION_DETAILS_MODULE)
    
    const stockLocationDetail = await stockLocationDetailsService.retrieveStockLocationDetail(id)
    
    res.json({
      stock_location_detail: stockLocationDetail
    })
  } catch (error) {
    console.error("Error fetching stock location detail:", error)
    res.status(500).json({ 
      error: "Failed to fetch stock location detail",
      details: error.message 
    })
  }
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const stockLocationDetailsService = req.scope.resolve(STOCK_LOCATION_DETAILS_MODULE)
    
    const stockLocationDetail = await stockLocationDetailsService.updateStockLocationDetails(id, req.body)
    
    res.json({
      stock_location_detail: stockLocationDetail
    })
  } catch (error) {
    console.error("Error updating stock location detail:", error)
    res.status(500).json({ 
      error: "Failed to update stock location detail",
      details: error.message 
    })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const stockLocationDetailsService = req.scope.resolve(STOCK_LOCATION_DETAILS_MODULE)
    
    await stockLocationDetailsService.deleteStockLocationDetails(id)
    
    res.status(204).send()
  } catch (error) {
    console.error("Error deleting stock location detail:", error)
    res.status(500).json({ 
      error: "Failed to delete stock location detail",
      details: error.message 
    })
  }
} 