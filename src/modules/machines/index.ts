import MachinesModuleService from "./service"
import Machine from "./models/machine"
import { Module } from "@medusajs/framework/utils"

export const MACHINES_MODULE = "machines"

export default Module(MACHINES_MODULE, {
  service: MachinesModuleService,
})

// Export linkable for module links
export const linkable = {
  machine: Machine,
}

export { 
  MachinesModuleService,
  Machine,
}
export * from "./types" 