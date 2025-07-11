import { model } from "@medusajs/utils"

export default model.define("supplier_product", {
  id: model.id().primaryKey(),
  supplier_id: model.text(),
  product_variant_id: model.text(),
  supplier_sku: model.text().nullable(),
  price: model.bigNumber(),
}) 