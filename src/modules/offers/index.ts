import OfferService from "./service"
import { Module } from "@medusajs/framework/utils"

export const OFFER_MODULE = "offer"

export default Module(OFFER_MODULE, {
  service: OfferService,
})

export * from "./models/offer"
export * from "./models/offer-line-item"
export * from "./models/offer-status-history"
