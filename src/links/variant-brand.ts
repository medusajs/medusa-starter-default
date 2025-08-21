import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import BrandsModule from "../modules/brands"

// Link each product variant to exactly one brand
export default defineLink(
  {
    linkable: ProductModule.linkable.productVariant,
    isList: false,
  },
  {
    linkable: BrandsModule.linkable.brand,
    filterable: ["id", "name", "code", "authorized_dealer", "is_oem"],
  }
)


