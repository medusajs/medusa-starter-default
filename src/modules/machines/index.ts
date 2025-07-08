import MachinesModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const MACHINES_MODULE = "machines"

export default Module(MACHINES_MODULE, {
  service: MachinesModuleService,
})

export { MachinesModuleService }
export * from "./types" 