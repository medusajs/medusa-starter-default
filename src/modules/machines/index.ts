import { Module } from "@medusajs/framework/utils"
import MachinesModuleService from "./service"

export const MACHINES_MODULE = "machines"

export default Module(MACHINES_MODULE, {
  service: MachinesModuleService,
  definition: {
    isQueryable: true
  }
})

export * from "./types"
export * from "./workflows"
export { MachinesModuleService } 