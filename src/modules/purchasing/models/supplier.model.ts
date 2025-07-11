import { model } from "@medusajs/utils"

export default model.define("supplier", {
  id: model.id().primaryKey(),
  name: model.text(),
  email: model.text().optional(),
}) 