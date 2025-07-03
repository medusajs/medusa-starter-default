import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STOCK_LOCATION_DETAILS_MODULE } from "../../../../modules/stock-location-details"
import StockLocationDetailsService from "../../../../modules/stock-location-details/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const stockLocationDetailsService: StockLocationDetailsService = req.scope.resolve(
    STOCK_LOCATION_DETAILS_MODULE
  )

  const locationDetail = await stockLocationDetailsService.retrieveStockLocationDetail(id)

  res.json({
    stock_location_detail: locationDetail
  })
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const stockLocationDetailsService: StockLocationDetailsService = req.scope.resolve(
    STOCK_LOCATION_DETAILS_MODULE
  )

  const updateData = req.body

  const locationDetail = await stockLocationDetailsService.updateStockLocationDetails(id, updateData)

  res.json({
    stock_location_detail: locationDetail
  })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const stockLocationDetailsService: StockLocationDetailsService = req.scope.resolve(
    STOCK_LOCATION_DETAILS_MODULE
  )

  await stockLocationDetailsService.deleteStockLocationDetails(id)

  res.status(204).send()
} 