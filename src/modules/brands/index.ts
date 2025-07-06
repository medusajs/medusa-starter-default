import BrandsService from "./service"
import Brand from "./models/brand"
import { Module } from "@medusajs/framework/utils"

export const BRANDS_MODULE = "brands"

export default Module(BRANDS_MODULE, {
  service: BrandsService,
})

export { Brand, BrandsService } 