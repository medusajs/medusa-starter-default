import { MedusaService } from "@medusajs/framework/utils"
import StockLocationDetail from "./models/stock-location-detail"

class StockLocationDetailsService extends MedusaService({
  StockLocationDetail,
}) {
  // The MedusaService will generate these methods automatically:
  // - listStockLocationDetails()
  // - retrieveStockLocationDetail() 
  // - createStockLocationDetails()
  // - updateStockLocationDetails()
  // - deleteStockLocationDetails()
  
  // Custom business logic methods
  async findByLocationCode(location_code: string) {
    const details = await this.listStockLocationDetails({
      location_code
    })
    return details[0]
  }

  async findByStockLocation(stock_location_id: string) {
    return await this.listStockLocationDetails({
      stock_location_id,
      is_active: true
    })
  }

  async searchByZone(zone: string) {
    return await this.listStockLocationDetails({
      zone,
      is_active: true
    })
  }

  async validateLocationCode(location_code: string): Promise<boolean> {
    try {
      const existing = await this.findByLocationCode(location_code)
      return !existing
    } catch {
      return true
    }
  }

  async generateLocationCode(
    zone?: string, 
    aisle?: string, 
    shelf?: string, 
    bin?: string
  ): Promise<string> {
    const parts = [zone, aisle, shelf, bin].filter(Boolean)
    return parts.join('-') || `LOC-${Date.now()}`
  }
}

export default StockLocationDetailsService 