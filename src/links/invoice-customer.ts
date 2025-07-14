import { defineLink } from "@medusajs/framework/utils"
import InvoicingModule from "../modules/invoicing"
import CustomerModule from "@medusajs/medusa/customer"

export default defineLink(
  InvoicingModule.linkable.invoice,
  CustomerModule.linkable.customer
) 