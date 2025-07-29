import { createStep } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { CreateRentalOrderDTO } from "../types"

export const validateRentalInputStep = createStep(
  "validate-rental-input",
  async (data: { rental: CreateRentalOrderDTO }) => {
    const { rental } = data

    // Required fields validation
    if (!rental.customer_id?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Customer ID is required"
      )
    }

    if (!rental.machine_id?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Machine ID is required"
      )
    }

    if (!rental.start_date) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Start date is required"
      )
    }

    if (!rental.end_date) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "End date is required"
      )
    }

    if (rental.daily_rate <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Daily rate must be greater than 0"
      )
    }

    // Date validation
    const startDate = new Date(rental.start_date)
    const endDate = new Date(rental.end_date)
    const now = new Date()

    if (startDate >= endDate) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "End date must be after start date"
      )
    }

    if (startDate < now) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Start date cannot be in the past"
      )
    }

    // Validate numeric fields
    if (rental.security_deposit && rental.security_deposit < 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Security deposit cannot be negative"
      )
    }

    if (rental.late_fee_percentage && (rental.late_fee_percentage < 0 || rental.late_fee_percentage > 100)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Late fee percentage must be between 0 and 100"
      )
    }

    return { validated: true }
  }
)