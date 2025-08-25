import BrandsService from "./service"
import { Module } from "@medusajs/framework/utils"

export const BRANDS_MODULE = "brands"

const BrandsModule = Module(BRANDS_MODULE, {
  service: BrandsService,
  definition: {
    isQueryable: true
  }
})

export default BrandsModule

export { BrandsService }