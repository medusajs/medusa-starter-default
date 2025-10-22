import { Module } from "@medusajs/framework/utils"
import B2BModuleService from "./service"

export const B2B_MODULE = "b2b"

export default Module(B2B_MODULE, {
  service: B2BModuleService,
})
