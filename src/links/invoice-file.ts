import { defineLink } from "@medusajs/framework/utils"
import InvoicingModule from "../modules/invoicing"
import FileModule from "@medusajs/medusa/file"

export default defineLink(
  InvoicingModule.linkable.invoice,
  FileModule.linkable.file
) 