import InventoryLocationModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const INVENTORY_LOCATION_MODULE = "inventory_location"

export default Module(INVENTORY_LOCATION_MODULE, {
  service: InventoryLocationModuleService,
}) 