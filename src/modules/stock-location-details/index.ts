import StockLocationDetailsService from "./service"
import StockLocationDetail from "./models/stock-location-detail"
import { Module } from "@medusajs/framework/utils"

export const STOCK_LOCATION_DETAILS_MODULE = "stockLocationDetails"

const StockLocationDetailsModule = Module(STOCK_LOCATION_DETAILS_MODULE, {
  service: StockLocationDetailsService,
  models: [StockLocationDetail],
  linkable: {
    stockLocationDetail: StockLocationDetail,
  },
})

export default StockLocationDetailsModule 