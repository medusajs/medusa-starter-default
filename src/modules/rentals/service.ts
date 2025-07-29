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
  MedusaService,
} from "@medusajs/framework/utils"
import RentalOrder from "./models/rental-order"
import RentalItem from "./models/rental-item"
import RentalStatusHistory from "./models/rental-status-history"
import { 
  CreateRentalOrderDTO, 
  UpdateRentalOrderDTO,
  CreateRentalItemDTO,
  UpdateRentalItemDTO,
  RentalOrderFilters,
  RentalOrderStatus,
  RentalOrderType
} from "./types"

type InjectedDependencies = {
  baseRepository: DAL.RepositoryService
  rentalOrderService: ModulesSdkTypes.IMedusaInternalService<any>
  rentalItemService: ModulesSdkTypes.IMedusaInternalService<any>
  rentalStatusHistoryService: ModulesSdkTypes.IMedusaInternalService<any>
}

export class RentalsModuleService
  extends MedusaService<{
    RentalOrder: { dto: any }
    RentalItem: { dto: any }
    RentalStatusHistory: { dto: any }
  }>({
    RentalOrder,
    RentalItem,
    RentalStatusHistory,
  })
{
  protected baseRepository_: DAL.RepositoryService
  protected rentalOrderService_: ModulesSdkTypes.IMedusaInternalService<
    InferEntityType<typeof RentalOrder>
  >
  protected rentalItemService_: ModulesSdkTypes.IMedusaInternalService<
    InferEntityType<typeof RentalItem>
  >
  protected rentalStatusHistoryService_: ModulesSdkTypes.IMedusaInternalService<
    InferEntityType<typeof RentalStatusHistory>
  >

  constructor(
    {
      baseRepository,
      rentalOrderService,
      rentalItemService,
      rentalStatusHistoryService,
    }: InjectedDependencies,
    protected readonly moduleDeclaration: InternalModuleDeclaration
  ) {
    // @ts-ignore
    super(...arguments)

    this.baseRepository_ = baseRepository
    this.rentalOrderService_ = rentalOrderService
    this.rentalItemService_ = rentalItemService
    this.rentalStatusHistoryService_ = rentalStatusHistoryService
  }

  // Rental Order Methods
  @InjectManager()
  async createRentalOrder(
    data: CreateRentalOrderDTO,
    @MedusaContext() sharedContext: Context = {}
  ) {
    // Generate rental order number
    const orderNumber = await this.generateRentalOrderNumber(sharedContext)
    
    const rentalOrderData = {
      ...data,
      rental_order_number: orderNumber,
      total_rental_cost: this.calculateTotalCost(data),
    }

    const rentalOrder = await this.createRentalOrders([rentalOrderData], sharedContext)
    
    // Create status history entry
    await this.createRentalStatusHistories([{
      rental_order_id: rentalOrder[0].id,
      from_status: null,
      to_status: RentalOrderStatus.DRAFT,
      change_reason: "Rental order created",
      changed_by: data.created_by,
    }], sharedContext)

    return rentalOrder[0]
  }

  @InjectManager()
  async updateRentalOrderStatus(
    rentalOrderId: string,
    newStatus: keyof typeof RentalOrderStatus,
    reason?: string,
    changedBy?: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const currentOrder = await this.retrieveRentalOrder(rentalOrderId, {}, sharedContext)
    
    const updatedOrder = await this.updateRentalOrders(
      { id: rentalOrderId },
      { status: newStatus },
      sharedContext
    )

    // Create status history entry
    await this.createRentalStatusHistories([{
      rental_order_id: rentalOrderId,
      from_status: currentOrder.status,
      to_status: newStatus,
      change_reason: reason || `Status changed to ${newStatus}`,
      changed_by: changedBy,
    }], sharedContext)

    return Array.isArray(updatedOrder) ? updatedOrder[0] : updatedOrder
  }

  @InjectManager()
  async getRentalOrdersByCustomer(
    customerId: string,
    config?: any,
    @MedusaContext() sharedContext: Context = {}
  ) {
    return await this.listRentalOrders(
      { customer_id: customerId },
      config,
      sharedContext
    )
  }

  @InjectManager()
  async getRentalOrdersByMachine(
    machineId: string,
    config?: any,
    @MedusaContext() sharedContext: Context = {}
  ) {
    return await this.listRentalOrders(
      { machine_id: machineId },
      config,
      sharedContext
    )
  }

  @InjectManager()
  async getActiveRentals(
    config?: any,
    @MedusaContext() sharedContext: Context = {}
  ) {
    return await this.listRentalOrders(
      { status: RentalOrderStatus.ACTIVE },
      config,
      sharedContext
    )
  }

  @InjectManager()
  async getOverdueRentals(
    config?: any,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const now = new Date()
    return await this.listRentalOrders(
      { 
        status: RentalOrderStatus.ACTIVE,
        end_date: { lte: now }
      },
      config,
      sharedContext
    )
  }

  @InjectManager()
  async returnRental(
    rentalOrderId: string,
    returnData: {
      actual_return_date?: Date
      condition_on_return?: string
      damage_notes?: string
      additional_charges?: number
      returned_by?: string
    },
    @MedusaContext() sharedContext: Context = {}
  ) {
    const updatedOrder = await this.updateRentalOrders(
      { id: rentalOrderId },
      {
        status: RentalOrderStatus.RETURNED,
        actual_return_date: returnData.actual_return_date || new Date(),
        condition_on_return: returnData.condition_on_return,
        damage_notes: returnData.damage_notes,
        additional_charges: returnData.additional_charges || 0,
      },
      sharedContext
    )

    // Create status history entry
    await this.createRentalStatusHistories([{
      rental_order_id: rentalOrderId,
      from_status: RentalOrderStatus.ACTIVE,
      to_status: RentalOrderStatus.RETURNED,
      change_reason: "Rental returned",
      changed_by: returnData.returned_by,
      notes: returnData.damage_notes,
    }], sharedContext)

    return Array.isArray(updatedOrder) ? updatedOrder[0] : updatedOrder
  }

  // Rental Item Methods
  @InjectManager()
  async addItemToRental(
    data: CreateRentalItemDTO,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const itemData = {
      ...data,
      line_total: this.calculateItemTotal(data),
    }

    return await this.createRentalItems([itemData], sharedContext)
  }

  @InjectManager()
  async getRentalItems(
    rentalOrderId: string,
    config?: any,
    @MedusaContext() sharedContext: Context = {}
  ) {
    return await this.listRentalItems(
      { rental_order_id: rentalOrderId },
      config,
      sharedContext
    )
  }

  // Status History Methods
  @InjectManager()
  async getRentalStatusHistory(
    rentalOrderId: string,
    config?: any,
    @MedusaContext() sharedContext: Context = {}
  ) {
    return await this.listRentalStatusHistories(
      { rental_order_id: rentalOrderId },
      { 
        ...config,
        order: { change_timestamp: "DESC" }
      },
      sharedContext
    )
  }

  // Utility Methods
  private async generateRentalOrderNumber(
    @MedusaContext() sharedContext: Context = {}
  ): Promise<string> {
    const year = new Date().getFullYear()
    const count = await this.listAndCountRentalOrders(
      { 
        created_at: { 
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`)
        }
      },
      {},
      sharedContext
    )
    
    const nextNumber = (count[1] + 1).toString().padStart(3, '0')
    return `RO-${year}-${nextNumber}`
  }

  private calculateTotalCost(data: CreateRentalOrderDTO): number {
    const days = Math.ceil(
      (data.end_date.getTime() - data.start_date.getTime()) / (1000 * 60 * 60 * 24)
    )
    
    let totalCost = days * data.daily_rate
    totalCost += data.security_deposit || 0
    totalCost += data.delivery_cost || 0
    totalCost += data.pickup_cost || 0
    totalCost += data.insurance_cost || 0
    
    return totalCost
  }

  private calculateItemTotal(data: CreateRentalItemDTO): number {
    // This would typically calculate based on rental period
    // For now, just return the daily rate
    return data.daily_rate * (data.quantity || 1)
  }
}

export default RentalsModuleService