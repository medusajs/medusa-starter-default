import WarrantiesService from "./service"
import Warranty from "./models/warranty"
import WarrantyLineItem from "./models/warranty-line-item"
import WarrantyStatusHistory from "./models/warranty-status-history"
import { Module } from "@medusajs/framework/utils"

export const WARRANTIES_MODULE = "warranties"

const WarrantiesModule = Module(WARRANTIES_MODULE, {
  service: WarrantiesService,
})

export default WarrantiesModule

export { 
  WarrantiesService,
  Warranty,
  WarrantyLineItem,
  WarrantyStatusHistory,
} 