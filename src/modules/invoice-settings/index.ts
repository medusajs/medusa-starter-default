import InvoiceSettingsService from "./service"
import { Module } from "@medusajs/framework/utils"
import createDefaultSettingsLoader from "./loaders/create-default-settings"

export const INVOICE_SETTINGS_MODULE = "invoiceSettings"

export default Module(INVOICE_SETTINGS_MODULE, {
  service: InvoiceSettingsService,
  loaders: [createDefaultSettingsLoader],
})

