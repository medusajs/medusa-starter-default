import { MedusaService } from "@medusajs/framework/utils"
import Machine from "./models/machine"

class MachinesService extends MedusaService({
  Machine,
}) {
  
  // Create a new machine
  async createMachine(data: any) {
    return await this.create(data)
  }

  // Retrieve a machine by ID
  async retrieveMachine(id: string) {
    return await this.retrieve(id)
  }

  // Update a machine
  async updateMachine(id: string, data: any) {
    return await this.update(id, data)
  }

  // Delete a machine
  async deleteMachine(id: string) {
    return await this.delete(id)
  }

  // List machines with filters and pagination
  async listMachines(filters: any = {}, config: any = {}) {
    return await this.list(filters, config)
  }

  // List and count machines with filters and pagination
  async listAndCountMachines(filters: any = {}, config: any = {}) {
    return await this.listAndCount(filters, config)
  }

  // Find machines with filters
  async findMachines(filters: any = {}) {
    return await this.list(filters)
  }

  // Count machines with filters
  async countMachines(filters: any = {}) {
    const [, count] = await this.listAndCount(filters)
    return count
  }
}

export default MachinesService 