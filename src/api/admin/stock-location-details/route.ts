import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STOCK_LOCATION_DETAILS_MODULE } from "../../../modules/stock-location-details"

interface CreateStockLocationDetailRequest {
  stock_location_id: string
  location_code: string
  zone?: string | null
  aisle?: string | null
  shelf?: string | null
  bin?: string | null
  is_active?: boolean
  metadata?: Record<string, unknown> | null
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const stockLocationDetailsService = req.scope.resolve(STOCK_LOCATION_DETAILS_MODULE)
    
    const { limit = 50, offset = 0, ...filters } = req.query
    
    const [data, count] = await stockLocationDetailsService.listAndCount(
      filters,
      {
        skip: Number(offset),
        take: Number(limit),
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
    
    const createData = req.body as CreateStockLocationDetailRequest
    const stockLocationDetail = await stockLocationDetailsService.create(createData)
    
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