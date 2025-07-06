import BrandsService from "./service"
import Brand from "./models/brand"
import { Module } from "@medusajs/framework/utils"

export const BRANDS_MODULE = "brands"

const BrandsModule = Module(BRANDS_MODULE, {
  service: BrandsService,
  models: [Brand],
  linkable: {
    brand: Brand,
  },
})

export default BrandsModule

export { Brand, BrandsService } 