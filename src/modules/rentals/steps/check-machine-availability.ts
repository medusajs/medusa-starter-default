import { createStep } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { CreateRentalOrderDTO, RentalOrderStatus } from "../types"
import { RENTALS_MODULE } from "../index"
import { RentalsModuleService } from "../service"

export const checkMachineAvailabilityStep = createStep(
  "check-machine-availability",
  async (data: { rental: CreateRentalOrderDTO }, { container }) => {
    const { rental } = data
    const rentalsService = container.resolve<RentalsModuleService>(RENTALS_MODULE)

    const startDate = new Date(rental.start_date)
    const endDate = new Date(rental.end_date)

    // Check for overlapping rentals
    const overlappingRentals = await rentalsService.listRentalOrders({
      machine_id: rental.machine_id,
      status: [
        RentalOrderStatus.CONFIRMED,
        RentalOrderStatus.ACTIVE
      ],
      $or: [
        {
          start_date: { lte: endDate },
          end_date: { gte: startDate }
        }
      ]
    })

    if (overlappingRentals.length > 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Machine is not available for the selected period. Conflicting rental found: ${overlappingRentals[0].rental_order_number}`
      )
    }

    return { available: true }
  }
)