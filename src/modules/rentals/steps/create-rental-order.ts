import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { CreateRentalOrderDTO } from "../types"
import { RENTALS_MODULE } from "../index"
import { RentalsModuleService } from "../service"

export const createRentalOrderStep = createStep(
  "create-rental-order",
  async (data: { rental: CreateRentalOrderDTO }, { container }) => {
    const { rental } = data
    const rentalsService = container.resolve<RentalsModuleService>(RENTALS_MODULE)
    
    const createdRental = await rentalsService.createRentalOrder(rental)
    
    return new StepResponse(createdRental, createdRental.id)
  },
  async (createdRentalId: string, { container }) => {
    if (!createdRentalId) {
      return
    }

    const rentalsService = container.resolve<RentalsModuleService>(RENTALS_MODULE)
    
    await rentalsService.deleteRentalOrders([createdRentalId])
  }
)