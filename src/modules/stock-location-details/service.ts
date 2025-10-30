import { MedusaService } from "@medusajs/framework/utils"
import StockLocationDetail from "./models/stock-location-detail"

class StockLocationDetailsService extends MedusaService({
  StockLocationDetail,
}){
  /**
   * Retrieve a single stock location detail by ID
   */
  async retrieve(id: string, config = {}) {
    return await this.retrieveStockLocationDetail(id, config)
  }

  /**
   * List stock location details with filters and pagination
   * Returns both data and count
   */
  async listAndCount(filters = {}, config = {}) {
    return await this.listAndCountStockLocationDetails(filters, config)
  }

  /**
   * Create a new stock location detail
   */
  async create(data: any) {
    const [created] = await this.createStockLocationDetails([data])
    return created
  }

  /**
   * Update an existing stock location detail
   */
  async update(id: string, data: any) {
    const [updated] = await this.updateStockLocationDetails([{
      id,
      ...data
    }])
    return updated
  }

  /**
   * Delete stock location details by IDs
   */
  async delete(ids: string[]) {
    return await this.deleteStockLocationDetails(ids)
  }
}

export default StockLocationDetailsService 