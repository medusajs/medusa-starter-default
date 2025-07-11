import { model } from "@medusajs/utils"

export default model.define("supplier_product", {
  id: model.id().primaryKey(),
  supplier_id: model.id(),
  product_variant_id: model.id(),
  supplier_sku: model.text().nullable(),
  price: model.bigNumber(),
}) 