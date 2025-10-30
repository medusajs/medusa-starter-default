import { Module } from "@medusajs/framework/utils"
import ResendNotificationProviderService from "./service"

export default Module("resend", {
  service: ResendNotificationProviderService,
})

