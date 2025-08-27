import TechniciansService from "./service"
import { Module } from "@medusajs/framework/utils"

export const TECHNICIANS_MODULE = "technicians"

const TechniciansModule = Module(TECHNICIANS_MODULE, {
  service: TechniciansService
})

export default TechniciansModule 