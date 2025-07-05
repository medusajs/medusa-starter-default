import TechniciansService from "./service"
import Technician from "./models/technician"
import { Module } from "@medusajs/framework/utils"

export const TECHNICIANS_MODULE = "technicians"

const TechniciansModule = Module(TECHNICIANS_MODULE, {
  service: TechniciansService,
  models: [Technician],
  linkable: {
    technician: Technician,
  },
})

export default TechniciansModule 