import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import PurchasingModule from "../modules/purchasing"

export default defineLink(
  {
    linkable: PurchasingModule.linkable.purchaseOrderItem,
    field: "product_variant_id",
  },
  ProductModule.linkable.productVariant,
  {
    readOnly: true,
  }
) 