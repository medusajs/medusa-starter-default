import { Module } from "@medusajs/framework/utils"
import PreorderModuleService from "./service"

export const PREORDER_MODULE = "preorder"

export default Module(PREORDER_MODULE, {
  service: PreorderModuleService,
})
