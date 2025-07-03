import { defineLink } from "@medusajs/framework/utils"
import StockLocationDetailsModule from "../modules/stock-location-details/index"
import { Modules } from "@medusajs/framework/utils"

// Link our custom stock location details to the built-in stock location module
export const StockLocationDetailsLink = defineLink(
  StockLocationDetailsModule.linkable.stockLocationDetail,
  {
    linkable: Modules.STOCK_LOCATION,
    field: "stock_location",
  }
)

// Link our custom stock location details to inventory items for capacity tracking
export const StockLocationDetailsInventoryLink = defineLink(
  StockLocationDetailsModule.linkable.stockLocationDetail,
  {
    linkable: Modules.INVENTORY,
    field: "inventory_item",
  }
) 