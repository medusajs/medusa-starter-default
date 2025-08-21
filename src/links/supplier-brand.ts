import { defineLink } from "@medusajs/framework/utils"
import BrandsModule from "../modules/brands"
import PurchasingModule from "../modules/purchasing"

// Link suppliers to many brands they are authorized to supply
export default defineLink(
  {
    linkable: PurchasingModule.linkable.supplier,
    isList: true,
  },
  {
    linkable: BrandsModule.linkable.brand,
    filterable: ["id", "name", "code", "authorized_dealer", "is_oem"],
  }
)


