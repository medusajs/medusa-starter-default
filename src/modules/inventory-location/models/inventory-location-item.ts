import { model } from "@medusajs/framework/utils"

const InventoryLocationItem = model.define("inventory_location_item", {
  id: model.id().primaryKey(),
  inventory_item_id: model.text(),
  location_id: model.text(),
  quantity: model.number().default(0),
  reserved_quantity: model.number().default(0),
})

export default InventoryLocationItem 