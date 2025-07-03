import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STOCK_LOCATION_DETAILS_MODULE } from "../../../modules/stock-location-details"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const stockLocationDetailsService = req.scope.resolve(STOCK_LOCATION_DETAILS_MODULE)
    
    const { limit = 50, offset = 0, ...filters } = req.query
    
    const [data, count] = await stockLocationDetailsService.listAndCountStockLocationDetails(
      filters,
      {
        limit: Number(limit),
        offset: Number(offset),
      }
    )
    
    res.json({
      stock_location_details: data,
      count,
      offset: Number(offset),
      limit: Number(limit),
    })
  } catch (error) {
    console.error("Error fetching stock location details:", error)
    res.status(500).json({ 
      error: "Failed to fetch stock location details",
      details: error.message 
    })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const stockLocationDetailsService = req.scope.resolve(STOCK_LOCATION_DETAILS_MODULE)
    
    const stockLocationDetail = await stockLocationDetailsService.createStockLocationDetails(req.body)
    
    res.status(201).json({
      stock_location_detail: stockLocationDetail
    })
  } catch (error) {
    console.error("Error creating stock location detail:", error)
    res.status(500).json({ 
      error: "Failed to create stock location detail",
      details: error.message 
    })
  }
} 