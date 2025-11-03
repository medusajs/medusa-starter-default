import { MedusaService } from "@medusajs/framework/utils"
import Rental, { RentalStatus } from "./models/rental"
import RentalStatusHistory from "./models/rental-status-history"

/**
 * TEM-202: Rentals Module Service
 *
 * Provides data management and business logic for hour-based machine rentals.
 * Key features:
 * - Auto-generates rental numbers (RNT-2025-001 format)
 * - Tracks machine hours (start/end) and calculates costs
 * - Manages rental status with history tracking
 */

type CreateRentalInput = {
  customer_id?: string
  machine_id?: string
  rental_type?: "hourly" | "daily" | "weekly" | "monthly"
  start_machine_hours?: number
  hourly_rate: number
  daily_rate?: number
  rental_start_date: Date
  expected_return_date: Date
  description?: string
  pickup_notes?: string
  deposit_amount?: number
  deposit_paid?: boolean
  created_by?: string
  metadata?: Record<string, any>
}

class RentalsService extends MedusaService({
  Rental,
  RentalStatusHistory,
}) {

  /**
   * TEM-202: Generate auto-incrementing rental number
   * Format: RNT-YYYY-XXX (e.g., RNT-2025-001)
   */
  async generateRentalNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const rentals = await this.listRentals({})
    const yearlyRentals = rentals.filter(rental =>
      rental.rental_number?.startsWith(`RNT-${year}`)
    )
    return `RNT-${year}-${String(yearlyRentals.length + 1).padStart(3, '0')}`
  }

  /**
   * TEM-202: Create rental with auto-generated number and status history
   */
  async createRentalWithNumber(data: CreateRentalInput) {
    const rentalNumber = await this.generateRentalNumber()

    const rental = await this.createRentals({
      ...data,
      rental_number: rentalNumber,
      status: RentalStatus.DRAFT,
      total_hours_used: 0,
      total_rental_cost: 0,
    })

    // Create initial status history entry
    await this.createRentalStatusHistories({
      rental_id: rental.id,
      from_status: null,
      to_status: RentalStatus.DRAFT,
      changed_by: data.created_by || "system",
      changed_at: new Date(),
      reason: "Rental created",
    })

    return rental
  }

  /**
   * TEM-202: Update rental status with automatic history tracking
   */
  async updateRentalStatus(
    id: string,
    newStatus: typeof RentalStatus[keyof typeof RentalStatus],
    userId: string,
    reason?: string
  ) {
    // Get current rental
    const rental = await this.retrieveRental(id)
    if (!rental) {
      throw new Error("Rental not found")
    }

    const oldStatus = rental.status

    // Update rental status
    const updatedRental = await this.updateRentals({
      id: id,
      status: newStatus,
      updated_by: userId,
    })

    // Create status history entry
    await this.createRentalStatusHistories({
      rental_id: id,
      from_status: oldStatus,
      to_status: newStatus,
      changed_by: userId,
      changed_at: new Date(),
      reason,
    })

    return updatedRental
  }

  /**
   * TEM-205: Calculate total hours used for a rental
   * Returns 0 if end_machine_hours is not set yet
   */
  async calculateTotalHours(rentalId: string): Promise<number> {
    const rental = await this.retrieveRental(rentalId)

    if (!rental.end_machine_hours || !rental.start_machine_hours) {
      return 0 // No end hours yet, no calculation
    }

    const totalHours = rental.end_machine_hours - rental.start_machine_hours

    if (totalHours < 0) {
      throw new Error("End hours cannot be less than start hours")
    }

    return totalHours
  }

  /**
   * TEM-205: Calculate rental cost based on machine hours used and rental type
   * Supports hourly and daily rental types
   * All monetary values stored in cents for precision
   */
  async calculateRentalCost(rentalId: string): Promise<{
    total_hours_used: number
    total_rental_cost: number
  }> {
    const rental = await this.retrieveRental(rentalId)

    if (!rental.end_machine_hours || !rental.start_machine_hours) {
      return {
        total_hours_used: 0,
        total_rental_cost: 0,
      } // No end hours yet, no calculation
    }

    const totalHours = rental.end_machine_hours - rental.start_machine_hours

    if (totalHours < 0) {
      throw new Error("End hours cannot be less than start hours")
    }

    let totalCost = 0

    // Calculate cost based on rental type
    if (rental.rental_type === 'hourly' && rental.hourly_rate) {
      totalCost = totalHours * rental.hourly_rate
    } else if (rental.rental_type === 'daily' && rental.daily_rate) {
      // For daily rentals, round up to full days
      const days = Math.ceil(totalHours / 24)
      totalCost = days * rental.daily_rate
    }

    return {
      total_hours_used: totalHours,
      total_rental_cost: totalCost,
    }
  }

  /**
   * TEM-205: Update rental totals based on calculated hours and costs
   * Called automatically when end_machine_hours is updated
   * Ensures atomic update of all calculated fields
   */
  async updateRentalTotals(rentalId: string) {
    const { total_hours_used, total_rental_cost } =
      await this.calculateRentalCost(rentalId)

    await this.updateRentals(
      { id: rentalId },
      {
        total_hours_used,
        total_rental_cost,
      }
    )
  }

  /**
   * TEM-205: Update end machine hours and recalculate total cost
   * Called when rental is returned or hours are logged
   * Automatically triggers updateRentalTotals() for cost calculation
   */
  async updateRentalHours(
    rentalId: string,
    endMachineHours: number,
    userId?: string
  ) {
    const rental = await this.retrieveRental(rentalId)
    if (!rental) {
      throw new Error("Rental not found")
    }

    if (!rental.start_machine_hours) {
      throw new Error("Start machine hours not set")
    }

    // TEM-205: Validation for end_hours >= start_hours
    if (endMachineHours < rental.start_machine_hours) {
      throw new Error("End hours cannot be less than start hours")
    }

    // Update end hours
    await this.updateRentals({
      id: rentalId,
      end_machine_hours: endMachineHours,
      updated_by: userId,
    })

    // TEM-205: Automatically recalculate totals when hours are updated
    await this.updateRentalTotals(rentalId)

    // Return updated rental
    return await this.retrieveRental(rentalId)
  }
}

export default RentalsService