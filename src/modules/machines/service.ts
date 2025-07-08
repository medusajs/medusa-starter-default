import {
  Context,
  DAL,
  InferEntityType,
  InternalModuleDeclaration,
  ModuleJoinerConfig,
  ModulesSdkTypes,
} from "@medusajs/framework/types"
import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaError,
  MedusaService,
} from "@medusajs/framework/utils"
import Machine from "./models/machine"
import { joinerConfig } from "./joiner-config"
import { MachineDTO, CreateMachineDTO, FilterableMachineProps } from "./types"

type InjectedDependencies = {
  baseRepository: DAL.RepositoryService
  machineService: ModulesSdkTypes.IMedusaInternalService<any>
}

export default class MachinesModuleService
  extends MedusaService<{
    Machine: { dto: MachineDTO }
  }>({
    Machine,
  })
{
  protected baseRepository_: DAL.RepositoryService
  protected machineService_: ModulesSdkTypes.IMedusaInternalService<
    InferEntityType<typeof Machine>
  >

  constructor(
    {
      baseRepository,
      machineService,
    }: InjectedDependencies,
    protected readonly moduleDeclaration: InternalModuleDeclaration
  ) {
    // @ts-ignore
    super(...arguments)

    this.baseRepository_ = baseRepository
    this.machineService_ = machineService
  }

  __joinerConfig(): ModuleJoinerConfig {
    return joinerConfig
  }

  // Validation methods
  validateMachineData(data: CreateMachineDTO | Partial<CreateMachineDTO>) {
    if (data.model !== undefined && !data.model?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Machine model cannot be empty"
      )
    }

    if (data.serial_number !== undefined && !data.serial_number?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Machine serial number cannot be empty"
      )
    }

    // Validate year if provided
    if (data.year !== undefined && data.year !== null) {
      const currentYear = new Date().getFullYear()
      if (data.year < 1900 || data.year > currentYear + 1) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Invalid year. Must be between 1900 and ${currentYear + 1}`
        )
      }
    }

    // Validate engine hours if provided
    if (data.engine_hours !== undefined && data.engine_hours !== null && data.engine_hours < 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Engine hours cannot be negative"
      )
    }

    // Validate weight if provided
    if (data.weight !== undefined && data.weight !== null && data.weight <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Weight must be greater than 0"
      )
    }

    // Validate horsepower if provided
    if (data.horsepower !== undefined && data.horsepower !== null && data.horsepower <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Horsepower must be greater than 0"
      )
    }
  }

  // Business logic methods
  async getMachinesByCustomer(
    customerId: string,
    config?: any,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<MachineDTO[]> {
    return await this.listMachines(
      { customer_id: customerId },
      config,
      sharedContext
    )
  }

  async getMachinesByStatus(
    status: "active" | "inactive" | "maintenance" | "sold",
    config?: any,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<MachineDTO[]> {
    return await this.listMachines(
      { status },
      config,
      sharedContext
    )
  }

  async updateMachineStatus(
    machineId: string,
    status: "active" | "inactive" | "maintenance" | "sold",
    @MedusaContext() sharedContext: Context = {}
  ): Promise<MachineDTO> {
    const [machine] = await this.updateMachines(
      [{ id: machineId, status }],
      sharedContext
    )
    return machine
  }

  async assignMachineToCustomer(
    machineId: string,
    customerId: string,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<MachineDTO> {
    const [machine] = await this.updateMachines(
      [{ id: machineId, customer_id: customerId }],
      sharedContext
    )
    return machine
  }

  async searchMachinesByModel(
    model: string,
    config?: any,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<MachineDTO[]> {
    return await this.listMachines(
      { model },
      config,
      sharedContext
    )
  }

  async getMachinesByLocation(
    location: string,
    config?: any,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<MachineDTO[]> {
    return await this.listMachines(
      { location },
      config,
      sharedContext
    )
  }

  async validateSerialNumberUnique(
    serialNumber: string,
    excludeMachineId?: string,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<boolean> {
    const machines = await this.listMachines(
      { serial_number: serialNumber },
      {},
      sharedContext
    )
    
    if (excludeMachineId) {
      return !machines.some(machine => machine.id !== excludeMachineId)
    }
    
    return machines.length === 0
  }
} 