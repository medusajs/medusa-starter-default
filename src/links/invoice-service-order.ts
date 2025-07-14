import { defineLink } from "@medusajs/framework/utils"
import InvoicingModule from "../modules/invoicing"
import ServiceOrdersModule from "../modules/service-orders"

export default defineLink(
  InvoicingModule.linkable.invoice,
  ServiceOrdersModule.linkable.serviceOrder
) 