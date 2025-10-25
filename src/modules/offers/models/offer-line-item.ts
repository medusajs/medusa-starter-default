import { model } from "@medusajs/framework/utils"
import Offer from "./offer"

export const OfferLineItemType = {
  PRODUCT: "product",
  CUSTOM: "custom", // Custom line items with description only
  DISCOUNT: "discount",
} as const

const OfferLineItem = model.define("offer_line_item", {
  id: model.id().primaryKey(),

  // Item Type
  item_type: model.enum(OfferLineItemType).default(OfferLineItemType.PRODUCT),

  // Product reference (for product line items)
  product_id: model.text().nullable(),
  variant_id: model.text().nullable(),

  // Item details
  title: model.text(),
  description: model.text().nullable(),
  sku: model.text().nullable(),

  // Quantities and Pricing (stored in cents)
  quantity: model.bigNumber(),
  unit_price: model.bigNumber(),
  total_price: model.bigNumber(),

  // Discounts and Taxes
  discount_amount: model.bigNumber().default(0),
  tax_rate: model.bigNumber().default(0),
  tax_amount: model.bigNumber().default(0),

  // Additional information
  notes: model.text().nullable(),
  metadata: model.json().nullable(),

  // Relationships
  offer: model.belongsTo(() => Offer, {
    mappedBy: "line_items",
  }),
})

export default OfferLineItem
