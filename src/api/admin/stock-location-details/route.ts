import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STOCK_LOCATION_DETAILS_MODULE } from "../../../modules/stock-location-details"
import StockLocationDetailsService from "../../../modules/stock-location-details/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const stockLocationDetailsService: StockLocationDetailsService = req.scope.resolve(
    STOCK_LOCATION_DETAILS_MODULE
  )

  const { stock_location_id, zone, aisle, location_code } = req.query

  let locationDetails
  
  if (location_code) {
    locationDetails = await stockLocationDetailsService.findByLocationCode(location_code as string)
    locationDetails = locationDetails ? [locationDetails] : []
  } else if (stock_location_id) {
    locationDetails = await stockLocationDetailsService.findByStockLocation(stock_location_id as string)
  } else if (zone) {
    locationDetails = await stockLocationDetailsService.searchByZone(zone as string)
  } else {
    locationDetails = await stockLocationDetailsService.listStockLocationDetails({
      is_active: true
    })
  }

  res.json({
    stock_location_details: locationDetails
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const stockLocationDetailsService: StockLocationDetailsService = req.scope.resolve(
    STOCK_LOCATION_DETAILS_MODULE
  )

  const {
    stock_location_id,
    zone,
    aisle,
    shelf,
    bin,
    location_type = "mixed",
    max_capacity,
    description,
    metadata
  } = req.body

  // Generate location code if not provided
  let location_code = req.body.location_code
  if (!location_code) {
    location_code = await stockLocationDetailsService.generateLocationCode(zone, aisle, shelf, bin)
  }

  // Validate location code is unique
  const isValid = await stockLocationDetailsService.validateLocationCode(location_code)
  if (!isValid) {
    return res.status(400).json({
      error: "Location code already exists"
    })
  }

  const locationDetail = await stockLocationDetailsService.createStockLocationDetails({
    stock_location_id,
    location_code,
    zone,
    aisle,
    shelf,
    bin,
    location_type,
    max_capacity,
    description,
    metadata
  })

  res.status(201).json({
    stock_location_detail: locationDetail
  })
} 