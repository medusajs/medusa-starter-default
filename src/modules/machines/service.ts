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
import { ModuleTranslator, I18nContext } from "../../utils/i18n-helper"
import { machineTranslations } from "./translations"

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
  private translator: ModuleTranslator

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
    
    // Initialize translator with machine translations
    this.translator = new ModuleTranslator(machineTranslations)
  }

  __joinerConfig(): ModuleJoinerConfig {
    return joinerConfig
  }

  // Helper method to get translation
  private t(key: string, language: string = "en", fallback?: string): string {
    return this.translator.translate(key, language, fallback)
  }

  // Enhanced validation methods with i18n support
  validateMachineData(data: CreateMachineDTO | Partial<CreateMachineDTO>, language: string = "en") {
    if (data.model !== undefined && !data.model?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        this.t("machine.validation.model_required", language, "Machine model cannot be empty")
      )
    }

    if (data.serial_number !== undefined && !data.serial_number?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        this.t("machine.validation.serial_required", language, "Machine serial number cannot be empty")
      )
    }

    // Validate year if provided
    if (data.year !== undefined && data.year !== null) {
      const currentYear = new Date().getFullYear()
      if (data.year < 1900 || data.year > currentYear + 1) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          this.t("machine.validation.invalid_year", language, `Invalid year. Must be between 1900 and ${currentYear + 1}`)
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

  // Enhanced methods with i18n context
  async createMachineWithI18n(
    data: CreateMachineDTO,
    i18nContext: I18nContext,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<MachineDTO> {
    this.validateMachineData(data, i18nContext.language)
    
    const [machine] = await this.createMachines([data], sharedContext)
    return machine
  }

  async updateMachineWithI18n(
    id: string,
    data: Partial<CreateMachineDTO>,
    i18nContext: I18nContext,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<MachineDTO> {
    this.validateMachineData(data, i18nContext.language)
    
    const [machine] = await this.updateMachines([{ id, ...data }], sharedContext)
    return machine
  }

  // Enhanced status update with localized status values
  async updateMachineStatusWithI18n(
    machineId: string,
    status: "active" | "inactive" | "maintenance" | "sold",
    i18nContext: I18nContext,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<{ machine: MachineDTO; statusText: string }> {
    const [machine] = await this.updateMachines(
      [{ id: machineId, status }],
      sharedContext
    )
    
    const statusText = this.t(`machine.status.${status}`, i18nContext.language)
    
    return { machine, statusText }
  }

  // Get localized machine data
  async getMachineWithLocalizedData(
    id: string,
    i18nContext: I18nContext,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<MachineDTO & { localizedStatus?: string }> {
    const machine = await this.retrieveMachine(id, {}, sharedContext)
    
    return {
      ...machine,
      localizedStatus: this.t(`machine.status.${machine.status}`, i18nContext.language)
    }
  }

  // Original methods (maintained for backward compatibility)
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