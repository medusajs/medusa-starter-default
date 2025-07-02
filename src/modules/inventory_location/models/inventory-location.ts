import { model } from "@medusajs/framework/utils"

const InventoryLocation = model.define("inventory_location", {
  id: model.id().primaryKey(),
  name: model.text().searchable(),
  warehouse_id: model.text().nullable(),
  description: model.text().nullable(),
  is_active: model.boolean().default(true),
})

export default InventoryLocation 