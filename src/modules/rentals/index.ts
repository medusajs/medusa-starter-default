import { Module } from "@medusajs/framework/utils"
import RentalsModuleService from "./service"

export const RENTALS_MODULE = "rentals"

export default Module(RENTALS_MODULE, {
  service: RentalsModuleService
})

export * from "./types"
export * from "./workflows"
export { RentalsModuleService }