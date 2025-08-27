import StockLocationDetailsService from "./service"
import { Module } from "@medusajs/framework/utils"

export const STOCK_LOCATION_DETAILS_MODULE = "stockLocationDetails"

const StockLocationDetailsModule = Module(STOCK_LOCATION_DETAILS_MODULE, {
  service: StockLocationDetailsService
})

export default StockLocationDetailsModule 