import { MedusaService, MedusaError } from "@medusajs/framework/utils"
import { InferTypeOf, DAL } from "@medusajs/framework/types"
import Technician from "./models/technician"

type TechnicianType = InferTypeOf<typeof Technician>

type InjectedDependencies = {
  technicianRepository: DAL.RepositoryService<TechnicianType>
}

interface FindConfig<T> {
  relations?: string[]
  select?: (keyof T)[]
  skip?: number
  take?: number
  order?: Record<string, "ASC" | "DESC">
}

interface UpdateTechnicianInput {
  name?: string
  email?: string
  phone?: string
  address?: string
  date_of_birth?: Date
  hire_date?: Date
  status?: string
  hourly_rate?: number
  specialties?: string[]
  certifications?: string[]
  emergency_contact_name?: string
  emergency_contact_phone?: string
  metadata?: Record<string, unknown>
}

class TechniciansService extends MedusaService({
  Technician,
}){
  protected technicianRepository_: DAL.RepositoryService<TechnicianType>

  constructor({ technicianRepository }: InjectedDependencies) {
    super(...arguments)
    this.technicianRepository_ = technicianRepository
  }

  /**
   * Retrieve a single technician by ID
   */
  async retrieve(
    id: string,
    config: FindConfig<TechnicianType> = {}
  ): Promise<TechnicianType> {
    const technician = await this.technicianRepository_.findOne({
      where: { id } as any,
      relations: config.relations,
    })

    if (!technician) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Technician with id ${id} not found`
      )
    }

    return technician
  }

  /**
   * List technicians based on filters
   */
  async list(
    filters: Record<string, any> = {},
    config: FindConfig<TechnicianType> = {}
  ): Promise<TechnicianType[]> {
    return await this.technicianRepository_.find({
      where: filters,
      relations: config.relations,
      order: config.order,
      take: config.take,
      skip: config.skip,
    } as any)
  }

  /**
   * Create a new technician
   */
  async create(
    data: Partial<TechnicianType>
  ): Promise<TechnicianType> {
    const technician = this.technicianRepository_.create(data as any)
    return await this.technicianRepository_.save(technician)
  }

  /**
   * Update an existing technician
   */
  async update(
    id: string,
    data: UpdateTechnicianInput
  ): Promise<TechnicianType> {
    const technician = await this.retrieve(id)

    // Update fields
    Object.assign(technician, data)

    return await this.technicianRepository_.save(technician)
  }

  /**
   * Delete technicians by IDs
   */
  async delete(ids: string[]): Promise<void> {
    await this.technicianRepository_.delete(ids as any)
  }
}

export default TechniciansService 