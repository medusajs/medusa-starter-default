import { Module } from "@medusajs/framework/utils"
import RentalsService from "./service"
import Rental from "./models/rental"
import RentalStatusHistory from "./models/rental-status-history"

/**
 * TEM-202: Rentals Module
 *
 * Exports the rentals module for hour-based machine rental management.
 * Module is registered in medusa-config.ts under custom modules.
 */

export const RENTALS_MODULE = "rentals"

const RentalsModule = Module(RENTALS_MODULE, {
  service: RentalsService
})

export default RentalsModule

export {
  RentalsService,
  Rental,
  RentalStatusHistory,
}