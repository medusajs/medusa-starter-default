import { defineLink } from "@medusajs/framework/utils"
import InvoicingModule from "../modules/invoicing"
import OrderModule from "@medusajs/medusa/order"

export default defineLink(
  InvoicingModule.linkable.invoice,
  OrderModule.linkable.order
) 