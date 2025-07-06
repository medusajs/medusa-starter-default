import BrandModule from "../modules/brands"
import ProductModule from "@medusajs/medusa/product"
import { defineLink } from "@medusajs/framework/utils"

export default defineLink(
  {
    linkable: ProductModule.linkable.product,
    isList: true, // One product can have multiple brands (OEM + aftermarket)
  },
  {
    linkable: BrandModule.linkable.brand,
    filterable: ["id", "name", "code", "authorized_dealer", "is_oem"], // Enable Index Module filtering
  }
) 