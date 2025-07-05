import { MedusaService } from "@medusajs/framework/utils"
import Technician from "./models/technician"

class TechniciansService extends MedusaService({
  Technician,
}) {
  
  // Create a new technician
  async createTechnician(data: any) {
    return await this.create(data)
  }

  // Retrieve a technician by ID
  async retrieveTechnician(id: string) {
    return await this.retrieve(id)
  }

  // Update a technician
  async updateTechnician(id: string, data: any) {
    return await this.update(id, data)
  }

  // Delete a technician
  async deleteTechnician(id: string) {
    return await this.delete(id)
  }

  // List technicians with filters and pagination
  async listTechnicians(filters: any = {}, config: any = {}) {
    return await this.list(filters, config)
  }

  // List and count technicians with filters and pagination
  async listAndCountTechnicians(filters: any = {}, config: any = {}) {
    return await this.listAndCount(filters, config)
  }

  // Find technicians with filters
  async findTechnicians(filters: any = {}) {
    return await this.list(filters)
  }

  // Count technicians with filters
  async countTechnicians(filters: any = {}) {
    const [, count] = await this.listAndCount(filters)
    return count
  }
}

export default TechniciansService 