import InvoicingService from "./service"
import { Module } from "@medusajs/framework/utils"

export const INVOICING_MODULE = "invoicing"

export default Module(INVOICING_MODULE, {
  service: InvoicingService,
  definition: {
    isQueryable: true
  }
}) 