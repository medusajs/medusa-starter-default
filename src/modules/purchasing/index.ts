import { Module } from "@medusajs/framework/utils"
import PurchasingService from "./service"

export const PURCHASING_MODULE = "purchasing"

export default Module(PURCHASING_MODULE, {
  service: PurchasingService,
})

export { PurchasingService }
export * from "./types"