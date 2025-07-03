import { MedusaService } from "@medusajs/framework/utils"
import StockLocationDetail from "./models/stock-location-detail"

class StockLocationDetailsService extends MedusaService({
  StockLocationDetail,
}){
}

export default StockLocationDetailsService 