import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import PurchasingModule from "../modules/purchasing"

export default defineLink(
  PurchasingModule.linkable.supplier,
  {
    linkable: ProductModule.linkable.productVariant,
    isList: true, // One supplier can supply multiple product variants
  }
) 