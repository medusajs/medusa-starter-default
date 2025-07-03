import MachinesService from "./service"
import Machine from "./models/machine"
import { Module } from "@medusajs/framework/utils"

export const MACHINES_MODULE = "machines"

const MachinesModule = Module(MACHINES_MODULE, {
  service: MachinesService,
  models: [Machine],
  linkable: {
    machine: Machine,
  },
})

export default MachinesModule 